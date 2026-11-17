"use client";

import { useRealtimeChanges } from "@/lib/realtime";

/**
 * Calls `onChange` whenever a friendship involving this player changes: a
 * request arrives, is answered, or a friend is removed. The caller reloads
 * its own list. Two subscriptions because a row names the player as either the
 * sender (`requester_id`) or the receiver (`addressee_id`), and a filter can
 * only name one column.
 */
export function useFriendshipChanges(
  userId: string | null | undefined,
  onChange: () => void,
) {
  useRealtimeChanges({
    table: "friendships",
    filter: userId ? `addressee_id=eq.${userId}` : undefined,
    enabled: Boolean(userId),
    onChange,
  });
  useRealtimeChanges({
    table: "friendships",
    filter: userId ? `requester_id=eq.${userId}` : undefined,
    enabled: Boolean(userId),
    onChange,
  });
}
