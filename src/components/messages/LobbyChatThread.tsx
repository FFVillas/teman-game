"use client";

import Link from "next/link";
import { CURRENT_PLAYER_ID, type Lobby } from "@/data/lfg-lobby";
import LobbyChat from "@/components/lobby/LobbyChat";
import {
  chatHref,
  lobbyHref,
  updateLobbySession,
  withPlayerMessage,
  type LobbySession,
} from "@/lib/lobby-session";

/**
 * A lobby's group chat, opened from the Messages page. It's the same chat as
 * on the lobby page and `/lobby/<id>/chat` — one conversation, three places
 * to reach it — so it goes through the same lobby session store.
 */
export default function LobbyChatThread({
  lobby,
  session,
}: {
  lobby: Lobby;
  session: LobbySession;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border-default px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- small cover thumbnail, no benefit from next/image optimization */}
        <img
          src={lobby.cover}
          alt=""
          className="size-9 shrink-0 rounded-lg object-cover object-top"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-bold text-white">
            {lobby.name}
          </span>
          <span className="truncate text-[11px] text-text-muted">
            Lobby chat · {lobby.members.length} players · closes when the
            lobby ends
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={lobbyHref(lobby)}
            className="text-xs font-semibold text-brand transition-opacity hover:opacity-80"
          >
            Open lobby
          </Link>
          <Link
            href={chatHref(lobby)}
            aria-label="Open the lobby chat page"
            title="Open chat page"
            className="flex size-8 items-center justify-center rounded-lg border border-border-default transition-colors hover:border-border-strong hover:bg-white/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src="/icons/chat-expand.svg" alt="" className="size-3.5" />
          </Link>
        </div>
      </div>

      <LobbyChat
        variant="embedded"
        messages={session.messages}
        currentUserId={CURRENT_PLAYER_ID}
        disabled={session.status === "completed"}
        closed={session.chatClosed}
        onSend={(body) =>
          updateLobbySession(lobby, (prev) => withPlayerMessage(prev, body))
        }
      />
    </div>
  );
}
