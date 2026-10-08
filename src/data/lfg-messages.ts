/**
 * Direct messages between the signed-in user and another player. Mirrors the
 * `direct_messages` entity in the thesis ERD — see docs/thesis-spec.md. Kept
 * separate from `LobbyMessage` (lfg-lobby.ts), which is lobby-scoped group
 * chat rather than a 1:1 DM.
 *
 * The rows themselves live in `public.direct_messages` and are read through
 * `src/lib/direct-messages.ts`; this file now only holds the shapes the
 * message components are built against.
 */

/**
 * Loose participant shape, same spirit as `ReportTarget` in lfg-lobby.ts —
 * lets a conversation be opened from a Friend, a PlayerProfile, a
 * DiscoverPlayer, etc. without requiring a full Friend record.
 */
export interface MessageParticipant {
  id: string;
  name: string;
  avatar: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  body: string;
  sentAt: string;
  /** Only meaningful for incoming messages — your own sends don't need it. */
  read?: boolean;
}

export interface Conversation {
  id: string;
  participant: MessageParticipant;
  messages: DirectMessage[];
}

/**
 * Sentinel id for "me". Messages loaded from the database carry it instead
 * of the signed-in user's real id, so "is this mine?" stays one comparison
 * in the components rather than threading the session id through them.
 */
export const CURRENT_USER_ID = "me";

/** Incoming messages in one conversation that haven't been read yet. */
export function unreadCountFor(conversation: Conversation): number {
  return conversation.messages.filter(
    (message) => message.senderId !== CURRENT_USER_ID && message.read === false,
  ).length;
}
