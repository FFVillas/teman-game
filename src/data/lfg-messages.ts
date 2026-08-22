import { onlineFriends, offlineFriends } from "./social-friends";

/**
 * Direct messages between the signed-in user and another player. Mirrors the
 * `direct_messages` entity in the thesis ERD — see docs/thesis-spec.md. Kept
 * separate from `LobbyMessage` (lfg-lobby.ts), which is lobby-scoped group
 * chat rather than a 1:1 DM.
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
 * Sentinel id for "me". AuthUser (contexts/AuthContext.tsx) doesn't carry a
 * real id yet — there's no backend session to pull one from — so locally
 * authored messages use this instead of a user id from another mock file.
 */
export const CURRENT_USER_ID = "me";

export const conversations: Conversation[] = [
  {
    id: "c-1",
    participant: onlineFriends[0], // ShadowStrike
    messages: [
      {
        id: "c1-m1",
        senderId: onlineFriends[0].id,
        body: "yo you up for ranked tonight?",
        sentAt: "Yesterday · 21:14",
        read: true,
      },
      {
        id: "c1-m2",
        senderId: CURRENT_USER_ID,
        body: "yeah give me 20, still queuing solo",
        sentAt: "Yesterday · 21:16",
      },
      {
        id: "c1-m3",
        senderId: onlineFriends[0].id,
        body: "bet, I'll get the lobby ready",
        sentAt: "Yesterday · 21:17",
        read: true,
      },
      {
        id: "c1-m4",
        senderId: onlineFriends[0].id,
        body: "you joining or nah lol",
        sentAt: "09:02",
        read: false,
      },
    ],
  },
  {
    id: "c-2",
    participant: onlineFriends[1], // HealerMain
    messages: [
      {
        id: "c2-m1",
        senderId: CURRENT_USER_ID,
        body: "gg earlier, that clutch on defense was nasty",
        sentAt: "Mon · 19:40",
      },
      {
        id: "c2-m2",
        senderId: onlineFriends[1].id,
        body: "lmao I was sure we lost that round",
        sentAt: "Mon · 19:42",
        read: true,
      },
      {
        id: "c2-m3",
        senderId: onlineFriends[1].id,
        body: "same time tomorrow?",
        sentAt: "08:15",
        read: false,
      },
    ],
  },
  {
    id: "c-3",
    participant: onlineFriends[2], // NoScopeGod
    messages: [
      {
        id: "c3-m1",
        senderId: onlineFriends[2].id,
        body: "add me back, need a 5th for the tournament lobby",
        sentAt: "07:50",
        read: false,
      },
      {
        id: "c3-m2",
        senderId: onlineFriends[2].id,
        body: "sign ups close tonight",
        sentAt: "07:51",
        read: false,
      },
    ],
  },
  {
    id: "c-4",
    participant: offlineFriends[0], // CarryPotter
    messages: [
      {
        id: "c4-m1",
        senderId: CURRENT_USER_ID,
        body: "hey, you still looking for a duo?",
        sentAt: "3 days ago",
      },
      {
        id: "c4-m2",
        senderId: offlineFriends[0].id,
        body: "yeah! what rank you at rn",
        sentAt: "3 days ago",
        read: true,
      },
    ],
  },
];

export function unreadCountFor(conversation: Conversation): number {
  return conversation.messages.filter(
    (message) => message.senderId !== CURRENT_USER_ID && message.read === false,
  ).length;
}

export function totalUnreadCount(list: Conversation[] = conversations): number {
  return list.reduce((sum, conversation) => sum + unreadCountFor(conversation), 0);
}

export function conversationByParticipantId(
  id: string,
  list: Conversation[] = conversations,
): Conversation | undefined {
  return list.find((conversation) => conversation.participant.id === id);
}
