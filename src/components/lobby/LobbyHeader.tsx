"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import Link from "next/link";
import type { LobbyStatus, LobbyViewerRole } from "@/data/lfg-lobby";
import type { LfgRank } from "@/data/lfg-ranks";
import type { LfgMode } from "@/data/lfg-teams";
import { modeStyles } from "@/components/lfg/LfgTeamCard";
import LobbyActionsMenu from "./LobbyActionsMenu";

/** The header works for mock lobbies and for ones from the database. */
type HeaderStatus = LobbyStatus | "scheduled" | "closed";

export interface LobbyHeaderLobby {
  cover: string;
  mode: LfgMode;
  name: string;
  bio?: string;
  region: string;
  languages?: string;
  micRequired: boolean;
  game: string;
  scheduledFor?: string;
  /** Shown as "Join voice". Only pass it for people who may use it. */
  discordUrl?: string;
  /** Mock lobbies: the minimum rank, shown as "X and up". */
  rank?: LfgRank;
}

const statusStyles: Record<HeaderStatus, { label: string; className: string }> = {
  forming: {
    label: "Forming",
    className: "border-border-strong text-text-subtle",
  },
  live: { label: "Live", className: "border-success text-success" },
  completed: { label: "Completed", className: "border-border-strong text-text-muted" },
  scheduled: { label: "Scheduled", className: "border-border-strong text-text-subtle" },
  closed: { label: "Closed", className: "border-border-strong text-text-muted" },
};

interface LobbyHeaderProps {
  lobby: LobbyHeaderLobby;
  role: LobbyViewerRole;
  status: HeaderStatus;
  onStart?: () => void;
  onEnd?: () => void;
  /** Leader of a started ("live") lobby: back to recruiting. */
  onReopen?: () => void;
  onLeave?: () => void;
  /** Replaces the rank line, e.g. the accepted range badge of a real lobby. */
  rankSlot?: ReactNode;
  /**
   * Top right, for people who have no menu (apply, withdraw, log in). Leaders
   * and members get the menu instead.
   */
  topAction?: ReactNode;
  /** Where "Edit details" goes. Omit when the lobby can't be edited. */
  editHref?: string;
  /** Leader of a lobby with no voice link yet: where to add one. */
  addVoiceHref?: string;
}

/**
 * Everything but the two main buttons lives at the top: the status chips on
 * the left, the menu (or the one action a visitor has) on the right. Only
 * "Start lobby" and "Join voice" sit at the bottom, so the header stays short.
 */
export default function LobbyHeader({
  lobby,
  role,
  status,
  onStart,
  onEnd,
  onReopen,
  onLeave,
  rankSlot,
  topAction,
  editHref,
  addVoiceHref,
}: LobbyHeaderProps) {
  const mode = modeStyles[lobby.mode];
  const statusStyle = statusStyles[status];
  const isLeader = role === "leader";
  const isOver = status === "completed" || status === "closed";
  const canStart =
    isLeader && (status === "forming" || status === "scheduled") && onStart;

  return (
    <header className="relative overflow-hidden rounded-2xl border border-border-strong bg-bg-card-alt">
      {/*
        Cover art is boxed on the right rather than stretched full-bleed.
        The art is portrait; spanning it across the whole ~950px header
        upscales it several times over and reads as a blurry zoom.
      */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] max-w-[400px] sm:block">
        <Image
          src={lobby.cover}
          alt=""
          fill
          sizes="400px"
          priority
          className="object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-card-alt via-bg-card-alt/55 to-transparent" />
      </div>

      <div className="relative flex min-h-[190px] flex-col p-6 sm:p-7">
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

          {topAction ??
            (isLeader ? (
              <LobbyActionsMenu
                editHref={editHref}
                onReopen={status === "live" ? onReopen : undefined}
                onEnd={isOver ? undefined : onEnd}
                endLabel={status === "live" ? "End lobby" : "Close lobby"}
              />
            ) : role === "member" && !isOver && onLeave ? (
              <LobbyActionsMenu onLeave={onLeave} />
            ) : null)}
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {lobby.name}
          </h1>
          {lobby.bio && (
            <p className="max-w-[520px] text-sm leading-relaxed text-text-subtle">
              {lobby.bio}
            </p>
          )}
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
          {rankSlot ??
            (lobby.rank && (
              <span className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization */}
                <img src={lobby.rank.icon} alt="" className="size-3" />
                <span className={`font-bold ${lobby.rank.colorClass}`}>
                  {lobby.rank.name} and up
                </span>
              </span>
            ))}
          {lobby.micRequired && (
            <span className="flex items-center gap-1.5 text-success">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lfg-mic.svg" alt="" className="h-2.5 w-2" />
              Mic required
            </span>
          )}
        </div>

        {(canStart || lobby.discordUrl || addVoiceHref) && (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            {canStart && (
              <button
                type="button"
                onClick={onStart}
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img src="/icons/lfg-play.svg" alt="" className="size-3" />
                Start lobby
              </button>
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

            {!lobby.discordUrl && addVoiceHref && (
              <Link
                href={addVoiceHref}
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-discord/60 px-4 text-xs font-bold text-white transition-colors hover:bg-discord/15"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img src="/icons/social-discord.svg" alt="" className="h-3 w-4" />
                Add voice link
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
