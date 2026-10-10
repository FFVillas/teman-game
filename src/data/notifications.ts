/**
 * Notifications — things that happened to you while you weren't looking.
 *
 * Distinct from toasts: a toast confirms something *you just did* and then
 * disappears. A notification is an incoming event you may need to come back
 * to, so it lives on `/notifications` until you read it.
 *
 * Covers requirement 5 in §3.2.4 of the proposal ("Sistem Notifikasi
 * Real-time" — notify the user when a join invitation arrives). Real delivery
 * is Firebase Cloud Messaging through a service worker; this is the UI seam
 * that will sit in front of it.
 */

import { gameBySlug } from "@/data/games";
import { navLinkFor } from "@/data/nav-links";

export type NotificationKind =
  | "lobby_invite"
  | "join_request"
  | "application_accepted"
  | "application_declined"
  | "lobby_started"
  | "rating_due"
  | "friend_request"
  | "review_received"
  | "removed_from_lobby";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Who triggered it, when there is a person behind it. */
  actorName?: string;
  actorAvatar?: string;
  /** Where clicking the notification should take you. */
  href?: string;
  createdAgo: string;
  read: boolean;
  /** Set once the user accepts or declines an actionable notification. */
  resolution?: "accepted" | "declined";
  /**
   * The row this notification is about: the application for a join request,
   * the invite for a lobby invite. Accept and Decline use it to answer the
   * real row.
   */
  refId?: string;
}

/**
 * Kinds the user can act on straight from the list. Friend requests are
 * deliberately excluded — they already have accept/decline on
 * /social/pending, so the notification just links there instead of
 * duplicating the action in two places.
 */
export const actionableKinds: NotificationKind[] = [
  "join_request",
  "lobby_invite",
];

export function isActionable(notification: AppNotification): boolean {
  return (
    actionableKinds.includes(notification.kind) && !notification.resolution
  );
}

/**
 * The game a notification is about, for its logo in the list. Read from the
 * link (`/lfg/<slug>/...`) rather than stored, so every lobby notification has
 * it without a new column. Undefined for anything not tied to a game.
 */
export function gameOfNotification(
  notification: AppNotification,
): { name: string; icon: string } | undefined {
  const slug = notification.href?.match(/^\/lfg\/([^/?#]+)/)?.[1];
  if (!slug) return undefined;
  const game = gameBySlug(slug);
  const icon = navLinkFor(slug)?.icon;
  return game && icon ? { name: game.name, icon } : undefined;
}

/** Icon + accent per kind, so the list is scannable without reading it. */
export const notificationStyles: Record<
  NotificationKind,
  { icon: string; tone: "brand" | "success" | "star" | "danger" }
> = {
  lobby_invite: { icon: "/icons/feature-matchmaking.svg", tone: "brand" },
  join_request: { icon: "/icons/people.svg", tone: "brand" },
  application_accepted: { icon: "/icons/feature-verified.svg", tone: "success" },
  application_declined: { icon: "/icons/feature-verified.svg", tone: "danger" },
  lobby_started: { icon: "/icons/lfg-play.svg", tone: "success" },
  rating_due: { icon: "/icons/player-star-full.svg", tone: "star" },
  friend_request: { icon: "/icons/player-add-friend.svg", tone: "brand" },
  review_received: { icon: "/icons/player-star-full.svg", tone: "star" },
  removed_from_lobby: { icon: "/icons/lobby-close.svg", tone: "danger" },
};

/**
 * Where the lobby's name sits in a title, per kind. The titles are written by
 * the database triggers (`lobby_notifications.sql`, `lobby_invites.sql`) as
 * plain text, so the list finds the name by the wording around it: keep these
 * in step with those triggers. A title that doesn't match just has no
 * emphasised lobby name, which is a safe failure.
 */
const lobbyNamePosition: Partial<
  Record<NotificationKind, { pattern: RegExp; at: "start" | "end" }>
> = {
  lobby_invite: { pattern: /^.+? invited you to (.+)$/, at: "end" },
  join_request: { pattern: /^.+? wants to join (.+)$/, at: "end" },
  application_accepted: { pattern: /^You're in (.+)$/, at: "end" },
  application_declined: { pattern: /^.+? declined your application to (.+)$/, at: "end" },
  lobby_started: { pattern: /^(.+) has started$/, at: "start" },
  rating_due: { pattern: /^Rate your teammates from (.+)$/, at: "end" },
  removed_from_lobby: { pattern: /^You were removed from (.+)$/, at: "end" },
};

export interface TitleSegment {
  text: string;
  /** A player's or lobby's name: drawn a step heavier than the rest. */
  name: boolean;
}

/**
 * A title split into plain text and names (the person behind it, and the
 * lobby), so the list can set names in a heavier weight than the sentence
 * around them.
 */
export function titleSegments(notification: AppNotification): TitleSegment[] {
  const { title, actorName, kind } = notification;
  // [start, end) ranges to emphasise.
  const ranges: Array<[number, number]> = [];

  if (actorName && title.startsWith(actorName)) {
    ranges.push([0, actorName.length]);
  }

  const lobby = lobbyNamePosition[kind];
  const lobbyName = lobby?.pattern.exec(title)?.[1];
  if (lobby && lobbyName) {
    ranges.push(
      lobby.at === "end"
        ? [title.length - lobbyName.length, title.length]
        : [0, lobbyName.length],
    );
  }

  ranges.sort((a, b) => a[0] - b[0]);
  const segments: TitleSegment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start < cursor) continue; // overlapping: the earlier one already covers it
    if (start > cursor) segments.push({ text: title.slice(cursor, start), name: false });
    segments.push({ text: title.slice(start, end), name: true });
    cursor = end;
  }
  if (cursor < title.length) segments.push({ text: title.slice(cursor), name: false });
  return segments;
}
