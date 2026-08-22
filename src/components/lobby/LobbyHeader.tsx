"use client";

import Image from "next/image";
import type { Lobby, LobbyStatus, LobbyViewerRole } from "@/data/lfg-lobby";
import { modeStyles } from "@/components/lfg/LfgTeamCard";
import LobbyActionsMenu from "./LobbyActionsMenu";

const statusStyles: Record<LobbyStatus, { label: string; className: string }> = {
  forming: {
    label: "Forming",
    className: "border-border-strong text-text-subtle",
  },
  live: { label: "Live", className: "border-success text-success" },
  completed: { label: "Completed", className: "border-border-strong text-text-muted" },
};

interface LobbyHeaderProps {
  lobby: Lobby;
  role: LobbyViewerRole;
  status: LobbyStatus;
  onStart: () => void;
  onEnd: () => void;
  onLeave: () => void;
}

export default function LobbyHeader({
  lobby,
  role,
  status,
  onStart,
  onEnd,
  onLeave,
}: LobbyHeaderProps) {
  const mode = modeStyles[lobby.mode];
  const statusStyle = statusStyles[status];
  const isLeader = role === "leader";

  return (
    <header className="relative overflow-hidden rounded-2xl border border-border-strong bg-bg-card-alt">
      <div className="absolute inset-0">
        <Image
          src={lobby.cover}
          alt=""
          fill
          sizes="1000px"
          priority
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-card-alt via-bg-card-alt/85 to-transparent" />
      </div>

      <div className="relative flex min-h-[260px] flex-col p-6 sm:p-7">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-wide ${mode.className}`}
            >
              {mode.label}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-wide ${statusStyle.className}`}
            >
              {status === "live" && (
                <span className="size-1.5 rounded-full bg-success" />
              )}
              {statusStyle.label}
            </span>
            {lobby.scheduledFor && (
              <span className="text-[11px] text-text-muted">
                {lobby.scheduledFor}
              </span>
            )}
          </div>

          {isLeader && (
            <LobbyActionsMenu
              editHref={`/lfg/${lobby.game}/create`}
              onEnd={status !== "completed" ? onEnd : undefined}
            />
          )}
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {lobby.name}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-text-subtle">
            {lobby.bio}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src="/icons/lfg-region.svg" alt="" className="size-3" />
            {lobby.region}
          </span>
          {lobby.languages && (
            <span className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lfg-language.svg" alt="" className="h-3 w-3.5" />
              {lobby.languages}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization */}
            <img src={lobby.rank.icon} alt="" className="size-3" />
            <span className={`font-bold ${lobby.rank.colorClass}`}>
              {lobby.rank.name}+ only
            </span>
          </span>
          {lobby.micRequired && (
            <span className="flex items-center gap-1.5 text-success">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lfg-mic.svg" alt="" className="h-2.5 w-2" />
              Mic required
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          {isLeader ? (
            status === "forming" && (
              <button
                type="button"
                onClick={onStart}
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img src="/icons/lfg-play.svg" alt="" className="size-3" />
                Start lobby
              </button>
            )
          ) : (
            status !== "completed" && (
              <button
                type="button"
                onClick={onLeave}
                className="flex h-10 items-center justify-center rounded-lg border border-border-strong px-5 text-xs font-bold text-text-subtle transition-colors hover:border-danger hover:text-danger"
              >
                Leave lobby
              </button>
            )
          )}

          {lobby.discordUrl && (
            <a
              href={lobby.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-discord px-4 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/social-discord.svg" alt="" className="h-3 w-4" />
              Join voice
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
