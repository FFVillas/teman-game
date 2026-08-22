"use client";

import { useState } from "react";
import { CURRENT_USER_ID, unreadCountFor, type Conversation } from "@/data/lfg-messages";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
}: ConversationListProps) {
  const [query, setQuery] = useState("");

  const filtered = conversations.filter((conversation) =>
    conversation.participant.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <aside className="hidden min-h-0 w-[280px] shrink-0 flex-col border-r border-border-default sm:flex">
      <div className="flex flex-col gap-4 p-6 pb-4">
        <h1 className="text-2xl font-extrabold text-white">Messages</h1>

        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img
            src="/icons/lfg-search.svg"
            alt=""
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 opacity-60"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search friends..."
            aria-label="Search conversations"
            className="h-10 w-full rounded-lg border border-border-default bg-bg-page pl-9 pr-3 text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 && (
          <p className="px-3 text-xs text-text-muted">
            {conversations.length === 0
              ? "No conversations yet."
              : `No friends found for "${query}".`}
          </p>
        )}

        {filtered.map((conversation) => {
          const lastMessage =
            conversation.messages[conversation.messages.length - 1];
          const unread = unreadCountFor(conversation);
          const active = conversation.id === activeId;

          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              aria-current={active}
              className={`flex items-center gap-2.5 rounded-xl p-2.5 text-left transition-colors ${
                active ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
              <img
                src={conversation.participant.avatar}
                alt=""
                className="size-9 shrink-0 rounded-full object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-bold text-white">
                  {conversation.participant.name}
                </span>
                <span
                  className={`truncate text-[11px] ${
                    unread > 0 ? "text-text-subtle" : "text-text-muted"
                  }`}
                >
                  {lastMessage
                    ? `${lastMessage.senderId === CURRENT_USER_ID ? "You: " : ""}${lastMessage.body}`
                    : "Say hi \u{1F44B}"}
                </span>
              </div>
              {unread > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-brand px-1 text-[11px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
