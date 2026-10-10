import type { SupabaseClient } from "@supabase/supabase-js";
import { avatarUrl } from "@/lib/avatar";
import { formatAgo } from "@/lib/relative-time";

/**
 * Reads and writes `public.friendships` and `public.blocks` — the real
 * tables behind /social, /social/pending, /social/discover and
 * /social/blocked. See 20261007010000_social.sql.
 *
 * /social/recent (teammates from past lobbies) isn't here: it needs real
 * match history, which arrives with the Lobby slice.
 */

export interface SocialProfile {
  id: string;
  username: string;
  avatar: string;
}

export interface FriendRow extends SocialProfile {
  friendshipId: string;
}

export interface IncomingRequestRow extends SocialProfile {
  friendshipId: string;
  sentAgo: string;
}

export interface BlockedRow extends SocialProfile {
  blockId: string;
}

interface ProfileRef {
  id: string;
  username: string;
  avatar_path: string | null;
}

function toProfile(row: ProfileRef): SocialProfile {
  return { id: row.id, username: row.username, avatar: avatarUrl(row.avatar_path) };
}

const PROFILE_COLS = "id, username, avatar_path";

/** Accepted friendships involving `userId`, the other person in each one. */
export async function fetchFriends(
  supabase: SupabaseClient,
  userId: string,
): Promise<FriendRow[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, requester_id, addressee_id,
       requester:profiles!friendships_requester_id_fkey(${PROFILE_COLS}),
       addressee:profiles!friendships_addressee_id_fkey(${PROFILE_COLS})`,
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error || !data) return [];

  return (
    data as unknown as {
      id: string;
      requester_id: string;
      requester: ProfileRef;
      addressee: ProfileRef;
    }[]
  ).map((row) => ({
    friendshipId: row.id,
    ...toProfile(row.requester_id === userId ? row.addressee : row.requester),
  }));
}

/** Pending requests addressed to `userId` — the ones they can answer. */
export async function fetchIncomingRequests(
  supabase: SupabaseClient,
  userId: string,
): Promise<IncomingRequestRow[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, created_at, requester:profiles!friendships_requester_id_fkey(${PROFILE_COLS})`,
    )
    .eq("status", "pending")
    .eq("addressee_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (
    data as unknown as { id: string; created_at: string; requester: ProfileRef }[]
  ).map((row) => ({
    friendshipId: row.id,
    sentAgo: formatAgo(row.created_at),
    ...toProfile(row.requester),
  }));
}

export async function sendFriendRequest(
  supabase: SupabaseClient,
  userId: string,
  targetId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: userId, addressee_id: targetId });
  return !error;
}

export async function acceptFriendRequest(
  supabase: SupabaseClient,
  friendshipId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", friendshipId);
  return !error;
}

/**
 * Answers the pending request a given player sent you. For the pop-up, which
 * knows who sent it (the notification's actor) but not the friendship's id.
 * Returns false if there is no such request or the write was refused.
 */
export async function answerFriendRequestFrom(
  supabase: SupabaseClient,
  requesterId: string,
  userId: string,
  accept: boolean,
): Promise<boolean> {
  const { data } = await supabase
    .from("friendships")
    .select("id")
    .eq("requester_id", requesterId)
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (!data) return false;
  return accept
    ? acceptFriendRequest(supabase, data.id as string)
    : removeFriendship(supabase, data.id as string);
}

/** Declining a pending request and unfriending are the same operation: the row goes away. */
export async function removeFriendship(
  supabase: SupabaseClient,
  friendshipId: string,
): Promise<boolean> {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  return !error;
}

export async function fetchBlocked(
  supabase: SupabaseClient,
  userId: string,
): Promise<BlockedRow[]> {
  const { data, error } = await supabase
    .from("blocks")
    .select(`id, blocked:profiles!blocks_blocked_id_fkey(${PROFILE_COLS})`)
    .eq("blocker_id", userId);

  if (error || !data) return [];

  return (data as unknown as { id: string; blocked: ProfileRef }[]).map((row) => ({
    blockId: row.id,
    ...toProfile(row.blocked),
  }));
}

/** Blocking also ends any friendship (either direction, any status) between the two. */
export async function blockUser(
  supabase: SupabaseClient,
  userId: string,
  targetId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: userId, blocked_id: targetId });
  if (error) return false;

  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${userId})`,
    );
  return true;
}

export async function unblockUser(
  supabase: SupabaseClient,
  blockId: string,
): Promise<boolean> {
  const { error } = await supabase.from("blocks").delete().eq("id", blockId);
  return !error;
}

/**
 * Players `userId` could add: not themselves, not already a friend or a
 * pending request either way, not blocked in either direction. PostgREST
 * can't express that exclusion as one query, so this reads the small
 * "who's already connected to me" set and filters client-side — fine at
 * this scale, and simpler than a dedicated view or RPC.
 */
export async function fetchDiscoverCandidates(
  supabase: SupabaseClient,
  userId: string,
  query?: string,
): Promise<SocialProfile[]> {
  const [relatedRes, blockedByMeRes, blockedMeRes, candidatesRes] = await Promise.all([
    supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", userId),
    supabase.from("blocks").select("blocker_id").eq("blocked_id", userId),
    (() => {
      let q = supabase
        .from("profiles")
        .select(PROFILE_COLS)
        .neq("id", userId)
        .limit(60);
      if (query && query.trim()) q = q.ilike("username", `%${query.trim()}%`);
      return q;
    })(),
  ]);

  const excluded = new Set<string>();
  for (const row of (relatedRes.data as { requester_id: string; addressee_id: string }[]) ?? []) {
    excluded.add(row.requester_id === userId ? row.addressee_id : row.requester_id);
  }
  for (const row of (blockedByMeRes.data as { blocked_id: string }[]) ?? []) {
    excluded.add(row.blocked_id);
  }
  for (const row of (blockedMeRes.data as { blocker_id: string }[]) ?? []) {
    excluded.add(row.blocker_id);
  }

  return ((candidatesRes.data as ProfileRef[]) ?? [])
    .filter((row) => !excluded.has(row.id))
    .map(toProfile);
}
