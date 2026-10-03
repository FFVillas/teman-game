"use client";

import Link from "next/link";
import {
  CURRENT_PLAYER_ID,
  currentPlayerMember,
  type Lobby,
  type LobbyViewerRole,
} from "@/data/lfg-lobby";
import BackLink from "@/components/BackLink";
import LobbyChat from "./LobbyChat";
import {
  lobbyHref,
  useLobbySession,
  withPlayerMessage,
} from "@/lib/lobby-session";

const statusLabels = {
  forming: { label: "Forming", className: "border-border-strong text-text-subtle" },
  live: { label: "Live", className: "border-success text-success" },
  completed: { label: "Ended", className: "border-border-strong text-text-muted" },
};

/**
 * A lobby's own chat page. Every lobby gets one automatically at
 * `/lobby/<id>/chat`, and it only exists while the lobby does: once the
 * lobby ends, the chat closes and its messages are cleared.
 *
 * Reads and writes the same lobby session as the lobby page, so the two
 * never disagree about what's been said.
 */
export default function LobbyChatRoom({
  lobby,
  initialRole,
}: {
  lobby: Lobby;
  initialRole: LobbyViewerRole;
}) {
  const { session, update } = useLobbySession(lobby);
  const role = session.roleOverride ?? initialRole;
  const isInvited = role === "invited";
  const status = statusLabels[session.status];

  const members =
    initialRole === "invited" && role === "member"
      ? [...lobby.members, currentPlayerMember]
      : lobby.members;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink label="Back to lobby" href={lobbyHref(lobby)} sticky={false} />
        <Link
          href={lobbyHref(lobby)}
          className="text-xs font-semibold text-brand transition-opacity hover:opacity-80"
        >
          Lobby details
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-strong bg-bg-card-alt px-5 py-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-extrabold text-white">
              {lobby.name}
            </h1>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${status.className}`}
            >
              {status.label}
            </span>
          </div>
          <p className="text-[11px] text-text-muted">
            {members.length}/{lobby.slotsTotal} players · this chat closes
            when the lobby ends
          </p>
        </div>
        <div className="flex items-center">
          {members.map((member) => (
            // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnails, no benefit from next/image optimization
            <img
              key={member.id}
              src={member.avatar}
              alt={member.name}
              title={member.name}
              className="-ml-2 size-8 rounded-full border-2 border-bg-card-alt object-cover first:ml-0"
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <LobbyChat
          variant="page"
          messages={session.messages}
          currentUserId={CURRENT_PLAYER_ID}
          disabled={session.status === "completed" || isInvited}
          disabledLabel={
            isInvited
              ? "Accept the invitation on the lobby page to chat"
              : "This lobby has ended"
          }
          closed={session.chatClosed}
          onSend={(body) => update((prev) => withPlayerMessage(prev, body))}
        />
      </div>
    </div>
  );
}
