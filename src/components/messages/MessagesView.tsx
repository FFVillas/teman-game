"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ConversationList, { type LobbyChatEntry } from "./ConversationList";
import MessageThread from "./MessageThread";
import LobbyChatThread from "./LobbyChatThread";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import {
  CURRENT_PLAYER_ID,
  allLobbies,
  viewerRoleIn,
} from "@/data/lfg-lobby";
import { useLobbySessions } from "@/lib/lobby-session";
import { CURRENT_USER_ID, type Conversation } from "@/data/lfg-messages";
import { useRealtimeInserts } from "@/lib/realtime";
import {
  fetchConversations,
  fetchThread,
  findMessageTarget,
  markThreadRead,
  sendDirectMessage,
} from "@/lib/direct-messages";

/**
 * Direct messages come from `direct_messages`; lobby chats still come from
 * the sessionStorage stand-in, because `lobby_messages` needs the lobby
 * tables that aren't built yet. One list, two sources, on purpose.
 */
export default function MessagesView() {
  const searchParams = useSearchParams();
  const { user, isReady } = useAuth();
  const { toast } = useNotifications();
  const meId = user?.role === "player" ? user.id : null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Read inside the realtime callback, which is created once per
  // subscription and would otherwise capture a stale `activeId`.
  const activeIdRef = useRef<string | null>(null);
  /** Set when ?user= points at somebody who isn't a real account. */
  const [missingTarget, setMissingTarget] = useState<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const lobbyParam = searchParams.get("lobby");
  const userParam = searchParams.get("user");
  const nameParam = searchParams.get("name");

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;

    async function load() {
      if (!meId) {
        if (!cancelled) setConversations([]);
        return;
      }

      const supabase = createClient();
      const threads = await fetchConversations(supabase, meId);
      if (cancelled) return;

      let list = threads;
      let open = lobbyParam ? `lobby:${lobbyParam}` : (threads[0]?.id ?? null);

      // "Message" buttons link here as ?user=<username>. If there's no
      // conversation yet, start an empty one so the first message has
      // somewhere to go.
      if (userParam) {
        // The link carries either a profile id (social rows) or a username
        // (profile page), so match on both.
        const existing = threads.find(
          (thread) =>
            thread.participant.id === userParam ||
            thread.participant.name.toLowerCase() === userParam.toLowerCase(),
        );
        if (existing) {
          open = existing.id;
        } else {
          const target = await findMessageTarget(supabase, userParam);
          if (cancelled) return;
          if (target) {
            const fresh: Conversation = {
              id: `dm:${target.id}`,
              participant: target,
              messages: [],
            };
            list = [fresh, ...threads];
            open = fresh.id;
          } else {
            // Sample rows link to people with no account behind them. Show
            // the display name from the link, never a raw id.
            setMissingTarget(nameParam ?? userParam);
          }
        }
      }

      // Load the opened thread here rather than in a follow-up effect: the
      // list only carries each conversation's latest message, and opening
      // one also marks it read.
      if (open?.startsWith("dm:")) {
        const partnerId = open.slice(3);
        const [messages] = await Promise.all([
          fetchThread(supabase, meId, partnerId),
          markThreadRead(supabase, meId, partnerId),
        ]);
        if (cancelled) return;
        list = list.map((conversation) =>
          conversation.id === open
            ? {
                ...conversation,
                messages: messages.map((message) => ({ ...message, read: true })),
              }
            : conversation,
        );
      }

      setConversations(list);
      setActiveId(open);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isReady, meId, userParam, nameParam, lobbyParam]);

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

  // Incoming messages only: your own sends are already on screen, so there
  // is nothing to listen for there.
  useRealtimeInserts<{ id: string; sender_id: string }>({
    table: "direct_messages",
    filter: meId ? `receiver_id=eq.${meId}` : undefined,
    enabled: Boolean(meId),
    onInsert: (row) => {
      if (!meId) return;
      const conversationId = `dm:${row.sender_id}`;
      const supabase = createClient();

      // Re-read rather than patching the row in: the sender may be someone
      // with no conversation yet, and this keeps one code path for both.
      fetchConversations(supabase, meId).then(async (threads) => {
        let next = threads;
        if (activeIdRef.current === conversationId) {
          const [messages] = await Promise.all([
            fetchThread(supabase, meId, row.sender_id),
            markThreadRead(supabase, meId, row.sender_id),
          ]);
          next = threads.map((thread) =>
            thread.id === conversationId
              ? {
                  ...thread,
                  messages: messages.map((m) => ({ ...m, read: true })),
                }
              : thread,
          );
        }
        setConversations(next);
      });
    },
  });

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const activeLobbyChat = lobbyChats.find((entry) => entry.key === activeId);

  const handleSelect = useCallback(
    async (id: string) => {
      setActiveId(id);
      if (!meId || !id.startsWith("dm:")) return;

      const partnerId = id.slice(3);
      const supabase = createClient();
      // Opening a conversation reads it; load the full thread at the same
      // time, since the list only carries the latest message.
      const [messages] = await Promise.all([
        fetchThread(supabase, meId, partnerId),
        markThreadRead(supabase, meId, partnerId),
      ]);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === id
            ? {
                ...conversation,
                messages: messages.map((message) => ({ ...message, read: true })),
              }
            : conversation,
        ),
      );
    },
    [meId],
  );

  async function handleSend(body: string) {
    if (!active || !meId) return;
    const partnerId = active.participant.id;

    const sent = await sendDirectMessage(createClient(), meId, partnerId, body);
    if (!sent) {
      // Silence here would look like the message was sent — the draft is
      // already cleared by the composer.
      toast({
        tone: "danger",
        title: "Message not sent",
        body: "Check your connection and try again.",
      });
      return;
    }

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === active.id
          ? { ...conversation, messages: [...conversation.messages, sent] }
          : conversation,
      ),
    );
  }

  if (isReady && !meId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon="/icons/nav-chat.svg"
          title="Log in to see your messages"
          description="Direct messages are private to the two people in them."
          action={{ label: "Log in", href: "/login?next=%2Fmessages" }}
        />
      </div>
    );
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
      ) : missingTarget && !active ? (
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6">
          <EmptyState
            title={`No account for ${missingTarget}`}
            description="That player comes from the sample data, not a registered account — there's nobody to message yet."
            size="sm"
          />
        </div>
      ) : (
        <MessageThread
          conversation={active}
          onSend={handleSend}
          currentUserId={CURRENT_USER_ID}
        />
      )}
    </>
  );
}
