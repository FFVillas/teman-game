"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ConversationList, { type LobbyChatEntry } from "./ConversationList";
import MessageThread from "./MessageThread";
import LobbyChatThread from "./LobbyChatThread";
import {
  CURRENT_PLAYER_ID,
  allLobbies,
  viewerRoleIn,
} from "@/data/lfg-lobby";
import { useLobbySessions } from "@/lib/lobby-session";
import {
  conversations as initialConversations,
  CURRENT_USER_ID,
  type Conversation,
} from "@/data/lfg-messages";

function markRead(conversation: Conversation): Conversation {
  return {
    ...conversation,
    messages: conversation.messages.map((message) => ({
      ...message,
      read: true,
    })),
  };
}

/**
 * Resolves the deep link a friend/profile "Message" button sends here —
 * /messages?user=<id>&name=<name>&avatar=<url> — into an initial state:
 * open the matching conversation, or start a fresh one if it doesn't exist
 * yet. Falls back to the first conversation with no query params. Computed
 * once as a useState initializer rather than in an effect, since it only
 * needs to run for the render that mounts this page.
 */
function buildInitialState(
  userId: string | null,
  name: string | null,
  avatar: string | null,
  lobbyId: string | null,
) {
  let conversations = initialConversations;
  let activeId = lobbyId
    ? `lobby:${lobbyId}`
    : (initialConversations[0]?.id ?? null);

  if (userId) {
    const existing = conversations.find(
      (conversation) => conversation.participant.id === userId,
    );
    if (existing) {
      activeId = existing.id;
    } else if (name && avatar) {
      const fresh: Conversation = {
        id: `c-${userId}`,
        participant: { id: userId, name, avatar },
        messages: [],
      };
      conversations = [fresh, ...conversations];
      activeId = fresh.id;
    }
  }

  // Opening a conversation reads it, so clear its unread flags up front.
  if (activeId) {
    conversations = conversations.map((conversation) =>
      conversation.id === activeId ? markRead(conversation) : conversation,
    );
  }

  return { conversations, activeId };
}

export default function MessagesView() {
  const searchParams = useSearchParams();
  const [state, setState] = useState(() =>
    buildInitialState(
      searchParams.get("user"),
      searchParams.get("name"),
      searchParams.get("avatar"),
      searchParams.get("lobby"),
    ),
  );
  const { conversations, activeId } = state;
  const active = conversations.find((c) => c.id === activeId) ?? null;

  // Lobby group chats you're part of (as leader or member), for as long as
  // the lobby runs. Invites don't count until accepted, and an ended lobby's
  // chat is gone — it drops off this list, not just the lobby page.
  const sessionFor = useLobbySessions();
  const lobbyChats = useMemo<LobbyChatEntry[]>(
    () =>
      allLobbies
        .filter((lobby) => {
          const session = sessionFor(lobby);
          const role =
            session.roleOverride ?? viewerRoleIn(lobby, CURRENT_PLAYER_ID);
          return (role === "leader" || role === "member") && !session.chatClosed;
        })
        .map((lobby) => {
          const { messages } = sessionFor(lobby);
          return {
            key: `lobby:${lobby.id}`,
            lobby,
            lastMessage: messages[messages.length - 1],
          };
        }),
    [sessionFor],
  );
  const activeLobbyChat = lobbyChats.find((entry) => entry.key === activeId);

  function handleSelect(id: string) {
    setState((prev) => ({
      activeId: id,
      conversations: prev.conversations.map((conversation) =>
        conversation.id === id ? markRead(conversation) : conversation,
      ),
    }));
  }

  function handleSend(body: string) {
    if (!active) return;
    const message = {
      id: `${active.id}-${Date.now()}`,
      senderId: CURRENT_USER_ID,
      body,
      sentAt: "Just now",
    };
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((conversation) =>
        conversation.id === active.id
          ? { ...conversation, messages: [...conversation.messages, message] }
          : conversation,
      ),
    }));
  }

  return (
    <>
      <ConversationList
        conversations={conversations}
        lobbyChats={lobbyChats}
        activeId={activeId}
        onSelect={handleSelect}
      />
      {activeLobbyChat ? (
        <LobbyChatThread
          lobby={activeLobbyChat.lobby}
          session={sessionFor(activeLobbyChat.lobby)}
        />
      ) : (
        <MessageThread conversation={active} onSend={handleSend} />
      )}
    </>
  );
}
