"use client";

import type { LobbyApplication } from "@/data/lfg-lobby";

/**
 * The match score is `S_total` from the recommendation engine. Showing the
 * number (rather than just ordering by it) is the explainability the thesis
 * argues for — the leader can see how strong a match the system thinks
 * someone is, and disagree with it.
 */
function MatchScore({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const tone =
    pct >= 75
      ? "text-success"
      : pct >= 45
        ? "text-star"
        : "text-danger";

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <span className={`text-sm font-bold ${tone}`}>{pct}%</span>
      <span className="text-[9px] uppercase tracking-wider text-text-muted">
        Match
      </span>
    </div>
  );
}

interface LobbyApplicationsProps {
  applications: LobbyApplication[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  /** Lobby is full, so accepting is blocked until a slot frees up. */
  isFull: boolean;
}

export default function LobbyApplications({
  applications,
  onAccept,
  onReject,
  isFull,
}: LobbyApplicationsProps) {
  const pending = applications.filter((a) => a.status === "pending");

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border-strong bg-bg-card-alt p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
          Join requests
        </h2>
        {pending.length > 0 && (
          <span className="rounded-md bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">
            {pending.length} pending
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-default p-6 text-center text-xs text-text-muted">
          No pending requests. New applicants will show up here, sorted by
          match score.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pending.map((app) => (
            <li
              key={app.id}
              className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-page p-3"
            >
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
                <img
                  src={app.avatar}
                  alt=""
                  className="size-10 shrink-0 rounded-full object-cover"
                />

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold text-white">
                      {app.applicantName}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {app.appliedAgo}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization */}
                      <img src={app.rank.icon} alt="" className="size-3" />
                      <span className={`font-bold ${app.rank.colorClass}`}>
                        {app.rank.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                      <img src={app.role.icon} alt="" className="size-3" />
                      {app.role.name}
                    </span>
                    <span className="flex items-center gap-1 text-star">
                      ★ {app.reputation.toFixed(1)}
                    </span>
                  </div>
                </div>

                <MatchScore score={app.matchScore} />
              </div>

              {app.message && (
                <p className="rounded-lg bg-white/[0.03] p-2.5 text-xs leading-relaxed text-text-subtle">
                  &ldquo;{app.message}&rdquo;
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAccept(app.id)}
                  disabled={isFull}
                  title={isFull ? "Lobby is full" : undefined}
                  className="flex h-8 flex-1 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => onReject(app.id)}
                  className="flex h-8 flex-1 items-center justify-center rounded-lg border border-border-strong text-xs font-semibold text-text-muted transition-colors hover:border-danger hover:text-danger"
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
