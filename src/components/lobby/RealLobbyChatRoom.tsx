"use client";

import Link from "next/link";
import BackLink from "@/components/BackLink";
import PlayerAvatar from "@/components/lfg/PlayerAvatar";
import RealLobbyChat from "./RealLobbyChat";

const statusStyle: Record<string, string> = {
  Forming: "border-border-strong text-text-subtle",
  Scheduled: "border-border-strong text-text-subtle",
  Live: "border-success text-success",
};

/**
 * A real lobby's own chat page: the same header as the mock one
 * (`LobbyChatRoom`) over the live chat.
 */
export default function RealLobbyChatRoom({
  lobbyId,
  game,
  name,
  status,
  slotsTotal,
  members,
  viewerId,
}: {
  lobbyId: string;
  game: string;
  name: string;
  status: "Forming" | "Scheduled" | "Live";
  slotsTotal: number;
  members: { id: string; name: string; avatar: string }[];
  viewerId: string;
}) {
  const lobbyHref = `/lfg/${game}/lobby/${lobbyId}`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink label="Back to lobby" href={lobbyHref} sticky={false} />
        <Link
          href={lobbyHref}
          className="text-xs font-semibold text-brand transition-opacity hover:opacity-80"
        >
          Lobby details
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-strong bg-bg-card-alt px-5 py-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-extrabold text-white">{name}</h1>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusStyle[status]}`}
            >
              {status}
            </span>
          </div>
          <p className="text-[11px] text-text-muted">
            {members.length}/{slotsTotal} players · this chat closes when the
            lobby ends
          </p>
        </div>
        <div className="flex items-center">
          {members.map((member, index) => (
            <PlayerAvatar
              key={member.id}
              src={member.avatar}
              name={member.name}
              style={{ zIndex: members.length - index }}
              className="-ml-2 size-8 border-2 border-bg-card-alt first:ml-0"
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <RealLobbyChat
          lobbyId={lobbyId}
          viewerId={viewerId}
          canChat
          variant="page"
        />
      </div>
    </div>
  );
}
