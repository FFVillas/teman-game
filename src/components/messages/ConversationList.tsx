"use client";

import { useState } from "react";
import { CURRENT_USER_ID, unreadCountFor, type Conversation } from "@/data/lfg-messages";
import {
  CURRENT_PLAYER_ID,
  type Lobby,
  type LobbyMessage,
} from "@/data/lfg-lobby";

/** A lobby you're in, listed alongside DMs. Keyed as `lobby:<id>`. */
export interface LobbyChatEntry {
  key: string;
  lobby: Lobby;
  lastMessage?: LobbyMessage;
}

interface ConversationListProps {
  conversations: Conversation[];
  lobbyChats?: LobbyChatEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="px-2.5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-text-muted first:pt-0">
      {children}
    </span>
  );
}

export default function ConversationList({
  conversations,
  lobbyChats = [],
  activeId,
  onSelect,
}: ConversationListProps) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const filtered = conversations.filter((conversation) =>
    conversation.participant.name.toLowerCase().includes(needle),
  );
  const filteredLobbies = lobbyChats.filter((entry) =>
    entry.lobby.name.toLowerCase().includes(needle),
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
            placeholder="Search chats..."
            aria-label="Search conversations"
            className="h-10 w-full rounded-lg border border-border-default bg-bg-page pl-9 pr-3 text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 && filteredLobbies.length === 0 && (
          <p className="px-3 text-xs text-text-muted">
            {conversations.length === 0 && lobbyChats.length === 0
              ? "No conversations yet."
              : `Nothing found for "${query}".`}
          </p>
        )}

        {/* Lobby group chats sit on top: they're temporary and time-bound,
            so they're what you most likely came here for. They drop off this
            list the moment the lobby ends. */}
        {filteredLobbies.length > 0 && <SectionLabel>Lobby chats</SectionLabel>}
        {filteredLobbies.map(({ key, lobby, lastMessage }) => {
          const active = key === activeId;
          const preview = lastMessage
            ? lastMessage.isSystem
              ? lastMessage.body
              : `${lastMessage.authorId === CURRENT_PLAYER_ID ? "You" : lastMessage.authorName}: ${lastMessage.body}`
            : "No messages yet";
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-current={active}
              className={`flex items-center gap-2.5 rounded-xl p-2.5 text-left transition-colors ${
                active ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small cover thumbnail, no benefit from next/image optimization */}
              <img
                src={lobby.cover}
                alt=""
                className="size-9 shrink-0 rounded-lg object-cover object-top"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-bold text-white">
                  {lobby.name}
                </span>
                <span className="truncate text-[11px] text-text-muted">
                  {preview}
                </span>
              </div>
            </button>
          );
        })}

        {filteredLobbies.length > 0 && filtered.length > 0 && (
          <SectionLabel>Direct messages</SectionLabel>
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
