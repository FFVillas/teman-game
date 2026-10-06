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

export type NotificationKind =
  | "lobby_invite"
  | "join_request"
  | "application_accepted"
  | "application_declined"
  | "lobby_started"
  | "rating_due"
  | "friend_request"
  | "message"
  | "review_received"
  | "report_update";

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
  message: { icon: "/icons/feature-chat.svg", tone: "brand" },
  review_received: { icon: "/icons/player-star-full.svg", tone: "star" },
  report_update: { icon: "/icons/feature-verified.svg", tone: "danger" },
};
