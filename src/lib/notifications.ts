import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppNotification, NotificationKind } from "@/data/notifications";
import { avatarUrl } from "@/lib/avatar";
import { formatAgo } from "@/lib/relative-time";

/**
 * Reads and writes `public.notifications` — the real table behind the bell
 * and `/notifications`.
 *
 * Toasts are NOT in here on purpose: a toast confirms something you just
 * did and is gone in four seconds, so storing it would be pure noise. Only
 * incoming events you may need to come back to get a row.
 */

interface NotificationRow {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  resolution: "accepted" | "declined" | null;
  created_at: string;
  actor: { username: string; avatar_path: string | null } | null;
}

const COLUMNS =
  "id, kind, title, body, href, read_at, resolution, created_at, actor:profiles!notifications_actor_id_fkey (username, avatar_path)";

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body ?? "",
    actorName: row.actor?.username,
    actorAvatar: row.actor ? avatarUrl(row.actor.avatar_path) : undefined,
    href: row.href ?? undefined,
    createdAgo: formatAgo(row.created_at),
    read: row.read_at !== null,
    resolution: row.resolution ?? undefined,
  };
}

/** Newest first — RLS already limits this to the caller's own rows. */
export async function fetchNotifications(
  supabase: SupabaseClient,
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return (data as unknown as NotificationRow[]).map(rowToNotification);
}

export interface NewNotification {
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;
  /** A real profile id. Mock flows leave this out. */
  actorId?: string;
}

/**
 * Files a notification for the signed-in user.
 *
 * The insert policy only allows rows addressed to yourself, so this covers
 * "something happened to me" while the app is still frontend-driven. Real
 * cross-player notifications ("X applied to your lobby") have to be written
 * server-side once the Lobby slice exists — a trigger on `applications`, or
 * an edge function — otherwise any account could spam anyone.
 */
export async function insertNotification(
  supabase: SupabaseClient,
  userId: string,
  input: NewNotification,
): Promise<AppNotification | null> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      actor_id: input.actorId ?? null,
    })
    .select(COLUMNS)
    .maybeSingle();

  if (error || !data) return null;
  return rowToNotification(data as unknown as NotificationRow);
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

/** Answering an invite / join request also counts as reading it. */
export async function resolveNotification(
  supabase: SupabaseClient,
  id: string,
  resolution: "accepted" | "declined",
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ resolution, read_at: new Date().toISOString() })
    .eq("id", id);
}
