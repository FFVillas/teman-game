"use client";

import Link from "next/link";
import RealLobbyChat from "@/components/lobby/RealLobbyChat";
import type { MyLobbyChat } from "@/lib/lobby-chat";

/**
 * A lobby's group chat, opened from the Messages page. It's the same chat as
 * on the lobby page and `/lobby/<id>/chat`: one conversation, three places to
 * reach it, all reading the same rows.
 */
export default function LobbyChatThread({
  chat,
  meId,
}: {
  chat: MyLobbyChat;
  meId: string;
}) {
  const lobbyHref = `/lfg/${chat.game}/lobby/${chat.lobbyId}`;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border-default px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- small cover thumbnail, no benefit from next/image optimization */}
        <img
          src={chat.cover}
          alt=""
          className="size-9 shrink-0 rounded-lg object-cover object-top"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-bold text-white">
            {chat.name}
          </span>
          <span className="truncate text-[11px] text-text-muted">
            Lobby chat · {chat.memberCount} players · closes when the lobby
            ends
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={lobbyHref}
            className="text-xs font-semibold text-brand transition-opacity hover:opacity-80"
          >
            Open lobby
          </Link>
          <Link
            href={`${lobbyHref}/chat`}
            aria-label="Open the lobby chat page"
            title="Open chat page"
            className="flex size-8 items-center justify-center rounded-lg border border-border-default transition-colors hover:border-border-strong hover:bg-white/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src="/icons/chat-expand.svg" alt="" className="size-3.5" />
          </Link>
        </div>
      </div>

      <RealLobbyChat
        // A new key per lobby, so switching chats starts a fresh subscription.
        key={chat.lobbyId}
        lobbyId={chat.lobbyId}
        viewerId={meId}
        canChat
        variant="embedded"
      />
    </div>
  );
}
