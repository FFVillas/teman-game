"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import RatingModal, { type LobbyReview } from "@/components/lobby/RatingModal";
import { modeStyles } from "@/components/lfg/LfgTeamCard";
import type { MatchRecord, MatchTeammate } from "@/data/match-history";
import type { ReportSubmission } from "@/data/lfg-lobby";

interface MatchDetailViewProps {
  match: MatchRecord;
  slug: string;
  username: string;
  /** Only the owner of the history can rate or report from here. */
  isOwner: boolean;
}

export default function MatchDetailView({
  match,
  slug,
  username,
  isOwner,
}: MatchDetailViewProps) {
  const mode = modeStyles[match.mode];

  // Review state lives here while there's no backend, so rating someone
  // updates the roster in place instead of needing a reload.
  const [reviewed, setReviewed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(match.teammates.map((t) => [t.id, t.reviewed]))
  );
  const [queue, setQueue] = useState<MatchTeammate[]>([]);
  const [justSaved, setJustSaved] = useState(0);

  const pending = match.teammates.filter((t) => !reviewed[t.id]);

  function handleComplete(
    reviews: LobbyReview[],
    reports: ReportSubmission[]
  ) {
    // TODO: POST reviews + reports; reviews recalculate reputation, reports
    // open moderation tickets. Separate tables, per the ERD.
    const touched = new Set([
      ...reviews.map((r) => r.targetId),
      ...reports.map((r) => r.targetId),
    ]);
    setReviewed((prev) => {
      const next = { ...prev };
      for (const id of touched) next[id] = true;
      return next;
    });
    setJustSaved(touched.size);
    setQueue([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/profile/${slug}/matches`}
        className="flex w-fit items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/lfg-back-arrow.svg" alt="" className="size-4" />
        Back to match history
      </Link>

      <header className="relative overflow-hidden rounded-2xl border border-border-strong bg-bg-card-alt">
        <div className="absolute inset-0">
          <Image
            src={match.cover}
            alt=""
            fill
            sizes="1000px"
            priority
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-card-alt via-bg-card-alt/85 to-transparent" />
        </div>

        <div className="relative flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${mode.className}`}
            >
              {mode.label}
            </span>
            <span className="inline-flex items-center rounded-full border border-border-strong px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
              Completed
            </span>
            {match.viewerWasLeader && (
              <span className="rounded bg-brand/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">
                You led this lobby
              </span>
            )}
          </div>

          <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            {match.lobbyName}
          </h1>

          <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">
            {[
              ["Ended", match.endedOn],
              ["Duration", match.duration],
              ["Type", match.lobbyType],
              ["Region", match.region],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="font-bold uppercase tracking-wider text-text-muted">
                  {label}
                </dt>
                <dd className="text-xs font-semibold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {justSaved > 0 && (
        <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">
          Saved — {justSaved} teammate{justSaved === 1 ? "" : "s"} updated.
        </p>
      )}

      {isOwner && pending.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-star/30 bg-star/[0.07] px-4 py-3">
          <p className="text-xs text-text-subtle">
            You skipped rating{" "}
            <span className="font-bold text-star">
              {pending.length} teammate{pending.length === 1 ? "" : "s"}
            </span>{" "}
            when this lobby ended. You can still do it here.
          </p>
          <button
            type="button"
            onClick={() => setQueue(pending)}
            className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-brand px-4 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            Rate {pending.length === 1 ? "them" : "all"}
          </button>
        </div>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-border-strong bg-bg-card-alt p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
            Lobby roster
          </h2>
          <span className="text-xs font-bold text-white">
            {match.teammates.length + 1} players
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {match.teammates.map((teammate) => {
            const isReviewed = reviewed[teammate.id];

            return (
              <li
                key={teammate.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border-default bg-bg-page p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
                <img
                  src={teammate.avatar}
                  alt=""
                  className={`size-10 shrink-0 rounded-full object-cover ${
                    teammate.wasLeader ? "border-2 border-brand" : ""
                  }`}
                />

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {teammate.slug ? (
                      <Link
                        href={`/profile/${teammate.slug}`}
                        className="truncate text-sm font-bold text-white hover:text-brand"
                      >
                        {teammate.name}
                      </Link>
                    ) : (
                      <span className="truncate text-sm font-bold text-white">
                        {teammate.name}
                      </span>
                    )}
                    {teammate.wasLeader && (
                      <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">
                        Leader
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization */}
                      <img src={teammate.rank.icon} alt="" className="size-3" />
                      <span className={`font-bold ${teammate.rank.colorClass}`}>
                        {teammate.rank.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                      <img src={teammate.role.icon} alt="" className="size-3" />
                      {teammate.role.name}
                    </span>
                  </div>
                </div>

                {isReviewed ? (
                  <span className="shrink-0 rounded-md bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success">
                    Reviewed
                  </span>
                ) : isOwner ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQueue([teammate])}
                      className="flex h-8 items-center justify-center rounded-lg bg-brand px-3 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
                    >
                      Rate
                    </button>
                    {teammate.slug && (
                      <Link
                        href={`/profile/${teammate.slug}/report`}
                        className="flex h-8 items-center justify-center rounded-lg border border-border-strong px-3 text-[11px] font-semibold text-text-muted transition-colors hover:border-danger hover:text-danger"
                      >
                        Report
                      </Link>
                    )}
                  </div>
                ) : (
                  <span className="shrink-0 rounded-md bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    Not rated
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {!isOwner && (
          <p className="text-[11px] text-text-muted">
            Only {username} can rate teammates from their own matches.
          </p>
        )}
      </section>

      {queue.length > 0 && (
        <RatingModal
          teammates={queue}
          lobbyName={match.lobbyName}
          game={match.game}
          lobbyId={match.id}
          onClose={() => setQueue([])}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
