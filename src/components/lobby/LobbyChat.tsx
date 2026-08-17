"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { LobbyMessage } from "@/data/lfg-lobby";

interface LobbyChatProps {
  messages: LobbyMessage[];
  currentUserId: string;
  /** Chat closes once the lobby is completed. */
  disabled?: boolean;
  onSend: (body: string) => void;
}

export default function LobbyChat({
  messages,
  currentUserId,
  disabled = false,
  onSend,
}: LobbyChatProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft("");
  }

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-2xl border border-border-strong bg-bg-card-alt">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
          Lobby chat
        </h2>
        <span className="text-[10px] text-text-muted">
          Visible to members only
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
        {messages.map((message) => {
          if (message.isSystem) {
            return (
              <p
                key={message.id}
                className="text-center text-[11px] italic text-text-muted"
              >
                {message.body}
              </p>
            );
          }

          const isMine = message.authorId === currentUserId;

          return (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
              <img
                src={message.avatar}
                alt=""
                className="size-7 shrink-0 rounded-full object-cover"
              />
              <div
                className={`flex max-w-[78%] flex-col gap-1 ${isMine ? "items-end" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-white">
                    {isMine ? "You" : message.authorName}
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
          disabled={disabled}
          placeholder={
            disabled ? "This lobby has ended" : "Message your lobby..."
          }
          aria-label="Message your lobby"
          className="h-10 flex-1 rounded-lg border border-border-strong bg-bg-page px-3 text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          className="flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  );
}
