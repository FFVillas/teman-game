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

/**
 * Seed data. Ordered newest first — the list renders in array order.
 */
export const seedNotifications: AppNotification[] = [
  {
    id: "n-1",
    kind: "join_request",
    title: "Threshcan wants to join your lobby",
    body: "Immortal duelist · 92% match — MAKAN BERGIZI GRATIS",
    actorName: "Threshcan",
    actorAvatar: "/lfg/avatars/avatar-4.jpg",
    href: "/lfg/valorant/lobby/lobby-1",
    createdAgo: "4m ago",
    read: false,
  },
  {
    id: "n-2",
    kind: "lobby_invite",
    title: "Tenz invited you to a lobby",
    body: "KINOYYY · Casual · starts around 9PM",
    actorName: "Tenz",
    actorAvatar: "/lfg/avatars/avatar-4.jpg",
    href: "/lfg/valorant/lobby/lobby-2",
    createdAgo: "18m ago",
    read: false,
  },
  {
    id: "n-3",
    kind: "message",
    title: "New message from Kinoyyy",
    body: "\u201cgimme 5, finishing a game\u201d",
    actorName: "Kinoyyy",
    actorAvatar: "/lfg/avatars/avatar-2.jpg",
    href: "/messages",
    createdAgo: "32m ago",
    read: false,
  },
  {
    id: "n-4",
    kind: "rating_due",
    title: "Rate your teammates",
    body: "You skipped 2 teammates when Shadow Stalkers ended.",
    href: "/profile/fayaz_ilovelittle/matches/match-1",
    createdAgo: "2h ago",
    read: true,
  },
  {
    id: "n-5",
    kind: "friend_request",
    title: "Ziza sent you a friend request",
    body: "Silver controller · SG2",
    actorName: "Ziza",
    actorAvatar: "/lfg/avatars/avatar-7.jpg",
    href: "/social/pending",
    createdAgo: "1d ago",
    read: true,
  },
  {
    id: "n-6",
    kind: "review_received",
    title: "You got a new review",
    body: "Yonziii rated you 5 stars and tagged you Good Comms.",
    actorName: "Yonziii",
    actorAvatar: "/lfg/avatars/avatar-1.jpg",
    href: "/profile/me",
    createdAgo: "2d ago",
    read: true,
  },
];
