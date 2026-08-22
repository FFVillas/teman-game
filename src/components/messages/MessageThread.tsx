"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { currentUser as mockCurrentUser } from "@/data/social-friends";
import { CURRENT_USER_ID, type Conversation } from "@/data/lfg-messages";

interface MessageThreadProps {
  conversation: Conversation | null;
  onSend: (body: string) => void;
}

export default function MessageThread({
  conversation,
  onSend,
}: MessageThreadProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const currentUser = user ?? mockCurrentUser;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation?.id, conversation?.messages.length]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft("");
  }

  if (!conversation) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm text-text-muted">
          Select a conversation to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border-default px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
        <img
          src={conversation.participant.avatar}
          alt=""
          className="size-9 rounded-full object-cover"
        />
        <span className="text-sm font-bold text-white">
          {conversation.participant.name}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-6">
        {conversation.messages.length === 0 && (
          <p className="text-center text-[11px] italic text-text-muted">
            No messages yet — say hi to {conversation.participant.name}.
          </p>
        )}

        {conversation.messages.map((message) => {
          const isMine = message.senderId === CURRENT_USER_ID;

          return (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
              <img
                src={isMine ? currentUser.avatar : conversation.participant.avatar}
                alt=""
                className="size-7 shrink-0 rounded-full object-cover"
              />
              <div
                className={`flex max-w-[78%] flex-col gap-1 ${isMine ? "items-end" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-white">
                    {isMine ? "You" : conversation.participant.name}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {message.sentAt}
                  </span>
                </div>
                <p
                  className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    isMine
                      ? "bg-brand text-white"
                      : "bg-bg-page text-text-subtle"
                  }`}
                >
                  {message.body}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border-subtle p-4"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${conversation.participant.name}...`}
          aria-label={`Message ${conversation.participant.name}`}
          className="h-10 flex-1 rounded-lg border border-border-strong bg-bg-page px-3 text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
