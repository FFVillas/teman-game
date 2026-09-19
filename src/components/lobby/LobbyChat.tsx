"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { LobbyMessage } from "@/data/lfg-lobby";
import { findProfileByUsername } from "@/data/player-profiles";

interface LobbyChatProps {
  messages: LobbyMessage[];
  currentUserId: string;
  /** Chat closes once the lobby is completed, or before you accept an invite. */
  disabled?: boolean;
  /** Placeholder shown while disabled. */
  disabledLabel?: string;
  onSend: (body: string) => void;
  /**
   * "panel" is the compact column on the lobby page; "page" fills the
   * lobby's own chat page; "embedded" sits inside the Messages page pane
   * (no frame of its own). Same component, same messages.
   */
  variant?: "panel" | "page" | "embedded";
  /** Panel only: opens the chat page. */
  expandHref?: string;
  /** Lobby over: the chat is gone, show why instead of an empty box. */
  closed?: boolean;
}

export default function LobbyChat({
  messages,
  currentUserId,
  disabled = false,
  disabledLabel = "This lobby has ended",
  onSend,
  variant = "panel",
  expandHref,
  closed = false,
}: LobbyChatProps) {
  const expanded = variant !== "panel";
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll the message list itself, not the page — scrollIntoView would drag
  // the whole window down to the chat on load.
  useEffect(() => {
    const list = scrollRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft("");
  }

  return (
    <section
      className={`flex flex-col ${
        variant === "embedded"
          ? "min-h-0 flex-1"
          : // Fixed height in the panel: the chat scrolls inside itself
            // instead of stretching to match the roster column.
            `rounded-2xl border border-border-strong bg-bg-card-alt ${
              expanded ? "h-full" : "h-[440px] lg:sticky lg:top-[120px]"
            }`
      }`}
    >
      {!expanded && (
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-3.5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
            Lobby chat
          </h2>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-[10px] text-text-muted sm:inline">
              Visible to members only
            </span>
            {expandHref && !closed && (
              <Link
                href={expandHref}
                aria-label="Open the lobby chat page"
                title="Open chat"
                className="flex size-8 items-center justify-center rounded-lg border border-border-default transition-colors hover:border-border-strong hover:bg-white/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img src="/icons/chat-expand.svg" alt="" className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {closed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-6 text-center">
          <p className="text-xs font-bold text-white">Chat closed</p>
          <p className="max-w-[260px] text-[11px] leading-relaxed text-text-muted">
            Lobby chats only last as long as the lobby. This one ended, so
            its messages were cleared.
          </p>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto ${
              expanded ? "p-5 sm:px-8 sm:py-6" : "p-5"
            }`}
          >
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
              const profileHref = isMine
                ? "/profile/me"
                : findProfileByUsername(message.authorName)
                  ? `/profile/${findProfileByUsername(message.authorName)!.slug}`
                  : undefined;

              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}
                >
                  {profileHref ? (
                    <Link href={profileHref} className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
                      <img
                        src={message.avatar}
                        alt=""
                        className="size-7 rounded-full object-cover transition-opacity hover:opacity-80"
                      />
                    </Link>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
                    <img
                      src={message.avatar}
                      alt=""
                      className="size-7 shrink-0 rounded-full object-cover"
                    />
                  )}
                  <div
                    className={`flex flex-col gap-1 ${expanded ? "max-w-[65%]" : "max-w-[78%]"} ${isMine ? "items-end" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      {profileHref && !isMine ? (
                        <Link
                          href={profileHref}
                          className="text-[11px] font-bold text-white hover:text-brand hover:underline"
                        >
                          {message.authorName}
                        </Link>
                      ) : (
                        <span className="text-[11px] font-bold text-white">
                          {isMine ? "You" : message.authorName}
                        </span>
                      )}
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
                disabled ? disabledLabel : "Message your lobby..."
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
        </>
      )}
    </section>
  );
}
