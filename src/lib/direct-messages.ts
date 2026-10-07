import type { SupabaseClient } from "@supabase/supabase-js";
import type { Conversation, DirectMessage } from "@/data/lfg-messages";
import { CURRENT_USER_ID } from "@/data/lfg-messages";
import { avatarUrl } from "@/lib/avatar";

/**
 * 1:1 chat, backed by `public.direct_messages`.
 *
 * Lobby chat is NOT here — it's a different entity (`lobby_messages`) that
 * needs the lobby tables, and still runs on `src/lib/lobby-session.ts`.
 *
 * Shapes returned here are the `Conversation` / `DirectMessage` the message
 * components were already built against, so the UI didn't have to change
 * when the mock array went away. Own messages carry `CURRENT_USER_ID` as
 * their sender so "is this mine?" stays one comparison.
 */

/** How many recent messages to scan when building the conversation list. */
const RECENT_LIMIT = 300;

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
  sender: { id: string; username: string; avatar_path: string | null } | null;
  receiver: { id: string; username: string; avatar_path: string | null } | null;
}

const COLUMNS =
  "id, sender_id, receiver_id, body, read_at, created_at, " +
  "sender:profiles!direct_messages_sender_id_fkey (id, username, avatar_path), " +
  "receiver:profiles!direct_messages_receiver_id_fkey (id, username, avatar_path)";

/** "21:14" for today, "6 Oct · 21:14" before that. */
function formatSentAt(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isToday = new Date().toDateString() === date.toDateString();
  if (isToday) return time;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${time}`;
}

function toMessage(row: MessageRow, meId: string): DirectMessage {
  return {
    id: row.id,
    senderId: row.sender_id === meId ? CURRENT_USER_ID : row.sender_id,
    body: row.body,
    sentAt: formatSentAt(row.created_at),
    read: row.read_at !== null,
  };
}

/**
 * Every conversation this player is part of, most recent first, each
 * carrying only its latest message — enough for the list, and the thread
 * itself is loaded when one is opened.
 *
 * Grouped in the app rather than by a SQL view: at thesis scale one indexed
 * read of the last few hundred messages is cheaper than maintaining a view,
 * and it keeps the schema exactly what the proposal describes.
 */
export async function fetchConversations(
  supabase: SupabaseClient,
  meId: string,
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("direct_messages")
    .select(COLUMNS)
    .or(`sender_id.eq.${meId},receiver_id.eq.${meId}`)
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);

  if (error || !data) return [];

  const byPartner = new Map<string, Conversation>();
  for (const row of data as unknown as MessageRow[]) {
    const partner = row.sender_id === meId ? row.receiver : row.sender;
    if (!partner) continue;

    const existing = byPartner.get(partner.id);
    if (existing) {
      // Rows arrive newest first, so anything after the first is older.
      existing.messages.unshift(toMessage(row, meId));
      continue;
    }
    byPartner.set(partner.id, {
      id: `dm:${partner.id}`,
      participant: {
        id: partner.id,
        name: partner.username,
        avatar: avatarUrl(partner.avatar_path),
      },
      messages: [toMessage(row, meId)],
    });
  }

  return [...byPartner.values()];
}

/** The full thread with one person, oldest first. */
export async function fetchThread(
  supabase: SupabaseClient,
  meId: string,
  partnerId: string,
): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from("direct_messages")
    .select(COLUMNS)
    .or(
      `and(sender_id.eq.${meId},receiver_id.eq.${partnerId}),` +
        `and(sender_id.eq.${partnerId},receiver_id.eq.${meId})`,
    )
    .order("created_at");

  if (error || !data) return [];
  return (data as unknown as MessageRow[]).map((row) => toMessage(row, meId));
}

export async function sendDirectMessage(
  supabase: SupabaseClient,
  meId: string,
  partnerId: string,
  body: string,
): Promise<DirectMessage | null> {
  const { data, error } = await supabase
    .from("direct_messages")
    .insert({ sender_id: meId, receiver_id: partnerId, body })
    .select(COLUMNS)
    .maybeSingle();

  if (error || !data) return null;
  return toMessage(data as unknown as MessageRow, meId);
}

/** Opening a conversation reads everything the other person sent. */
export async function markThreadRead(
  supabase: SupabaseClient,
  meId: string,
  partnerId: string,
): Promise<void> {
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("receiver_id", meId)
    .eq("sender_id", partnerId)
    .is("read_at", null);
}

/** For the navbar badge. */
export async function fetchUnreadMessageCount(
  supabase: SupabaseClient,
  meId: string,
): Promise<number> {
  const { count } = await supabase
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", meId)
    .is("read_at", null);
  return count ?? 0;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the `?user=` deep link to a real profile.
 *
 * It arrives in either form, depending on where it was clicked: social rows
 * carry a profile id (they already read real accounts), the profile page
 * carries a username (its own slug). Accepting both keeps every "Message"
 * button working instead of making them agree on one shape.
 */
export async function findMessageTarget(
  supabase: SupabaseClient,
  identifier: string,
): Promise<Conversation["participant"] | null> {
  const query = supabase.from("profiles").select("id, username, avatar_path");

  const { data } = UUID_PATTERN.test(identifier)
    ? await query.eq("id", identifier).maybeSingle()
    : await query
        .ilike("username", identifier.replace(/[\\%_]/g, "\\$&"))
        .maybeSingle();

  if (!data) return null;
  return {
    id: data.id as string,
    name: data.username as string,
    avatar: avatarUrl(data.avatar_path as string | null),
  };
}
