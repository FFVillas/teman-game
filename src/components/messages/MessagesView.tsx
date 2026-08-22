"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";
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
) {
  let conversations = initialConversations;
  let activeId = initialConversations[0]?.id ?? null;

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
    ),
  );
  const { conversations, activeId } = state;
  const active = conversations.find((c) => c.id === activeId) ?? null;

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
        activeId={activeId}
        onSelect={handleSelect}
      />
      <MessageThread conversation={active} onSend={handleSend} />
    </>
  );
}
