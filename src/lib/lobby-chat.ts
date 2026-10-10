import type { SupabaseClient } from "@supabase/supabase-js";
import type { LobbyMessage } from "@/data/lfg-lobby";
import { coverSrc } from "@/data/lfg-covers";
import { avatarUrl } from "@/lib/avatar";

/**
 * Lobby chat, backed by `public.lobby_messages` (20261011000000).
 *
 * Rows are shaped into `LobbyMessage`, the type the chat components were
 * already built against, so the mock screens and the real ones share one
 * component. Reading and writing are limited by the database to the leader
 * and accepted members of a lobby that is still open; once it ends the chat
 * is closed for players (an admin can still read it as evidence).
 */

const COLUMNS =
  "id, lobby_id, sender_id, kind, body, created_at, sender:profiles!lobby_messages_sender_id_fkey (username, avatar_path)";

interface MessageRow {
  id: string;
  lobby_id: string;
  sender_id: string | null;
  kind: "message" | "system";
  body: string;
  created_at: string;
  sender: { username: string; avatar_path: string | null } | null;
}

/** "21:14" for today, "6 Oct · 21:14" before that. */
function formatSentAt(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (new Date().toDateString() === date.toDateString()) return time;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${time}`;
}

function toMessage(row: MessageRow): LobbyMessage {
  const isSystem = row.kind === "system";
  return {
    id: row.id,
    authorId: row.sender_id ?? "system",
    authorName: isSystem ? "System" : (row.sender?.username ?? "Unknown"),
    avatar: row.sender ? avatarUrl(row.sender.avatar_path) : undefined,
    profileSlug: row.sender?.username,
    body: row.body,
    sentAt: formatSentAt(row.created_at),
    isSystem,
  };
}

const MESSAGE_LIMIT = 200;

/** The latest messages of one lobby, oldest first. */
export async function fetchLobbyMessages(
  supabase: SupabaseClient,
  lobbyId: string,
): Promise<LobbyMessage[]> {
  const { data, error } = await supabase
    .from("lobby_messages")
    .select(COLUMNS)
    .eq("lobby_id", lobbyId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_LIMIT);
  if (error || !data) return [];
  return (data as unknown as MessageRow[]).map(toMessage).reverse();
}

/** One message by id; used when a realtime event announces a new row. */
export async function fetchLobbyMessage(
  supabase: SupabaseClient,
  id: string,
): Promise<LobbyMessage | null> {
  const { data } = await supabase
    .from("lobby_messages")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ? toMessage(data as unknown as MessageRow) : null;
}

export async function sendLobbyMessage(
  supabase: SupabaseClient,
  lobbyId: string,
  meId: string,
  body: string,
): Promise<{ message: LobbyMessage } | { error: string }> {
  const { data, error } = await supabase
    .from("lobby_messages")
    .insert({ lobby_id: lobbyId, sender_id: meId, body: body.trim() })
    .select(COLUMNS)
    .maybeSingle();

  if (error || !data) {
    if (error?.message.includes("chat_rate_limited")) {
      return { error: "You're sending messages too fast. Wait a moment." };
    }
    if (error?.code === "42501") {
      return { error: "You can't chat in this lobby any more." };
    }
    return { error: "Check your connection and try again." };
  }
  return { message: toMessage(data as unknown as MessageRow) };
}

/** A lobby chat for the Messages list: who it is, and its latest line. */
export interface MyLobbyChat {
  lobbyId: string;
  name: string;
  game: string;
  cover: string;
  memberCount: number;
  /** "chat1: hello", "You: hello" or the system line; empty before the first message. */
  preview: string;
}

/**
 * Every open lobby the player is in, with the latest line of its chat.
 * An ended lobby isn't here: its chat is closed for players.
 */
export async function fetchMyLobbyChats(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyLobbyChat[]> {
  const { data: mine } = await supabase
    .from("lobby_members")
    .select("lobby_id")
    .eq("user_id", userId);
  const ids = (mine ?? []).map((row) => row.lobby_id as string);
  if (ids.length === 0) return [];

  const [{ data: lobbyRows }, { data: roster }, { data: recent }] = await Promise.all([
    supabase
      .from("lobbies")
      .select("id, name, cover, created_at, games(slug)")
      .in("id", ids)
      .in("status", ["live", "scheduled", "started"]),
    supabase.from("lobby_members").select("lobby_id").in("lobby_id", ids),
    supabase
      .from("lobby_messages")
      .select(COLUMNS)
      .in("lobby_id", ids)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const latest = new Map<string, MessageRow>();
  for (const row of (recent ?? []) as unknown as MessageRow[]) {
    if (!latest.has(row.lobby_id)) latest.set(row.lobby_id, row);
  }
  const counts = new Map<string, number>();
  for (const row of (roster ?? []) as Array<{ lobby_id: string }>) {
    counts.set(row.lobby_id, (counts.get(row.lobby_id) ?? 0) + 1);
  }

  const lobbies = (lobbyRows ?? []) as unknown as Array<{
    id: string;
    name: string;
    cover: string | null;
    created_at: string;
    games: { slug: string } | { slug: string }[] | null;
  }>;

  return lobbies
    .map((lobby) => {
      const game = Array.isArray(lobby.games) ? lobby.games[0] : lobby.games;
      const slug = game?.slug ?? "";
      const last = latest.get(lobby.id);
      const preview = !last
        ? "No messages yet"
        : last.kind === "system"
          ? last.body
          : `${last.sender_id === userId ? "You" : (last.sender?.username ?? "Someone")}: ${last.body}`;
      return {
        lobbyId: lobby.id,
        name: lobby.name,
        game: slug,
        cover: coverSrc(slug, lobby.cover),
        memberCount: counts.get(lobby.id) ?? 1,
        preview,
        // For ordering only: the latest activity first.
        at: last?.created_at ?? lobby.created_at,
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .map(({ at, ...chat }) => {
      void at;
      return chat;
    });
}
