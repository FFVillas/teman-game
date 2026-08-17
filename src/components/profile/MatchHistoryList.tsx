import Link from "next/link";
import Image from "next/image";
import { pendingReviews, type MatchRecord } from "@/data/match-history";
import { modeStyles } from "@/components/lfg/LfgTeamCard";

interface MatchHistoryListProps {
  matches: MatchRecord[];
  slug: string;
  /** Only the owner can act on unrated teammates, so hide the nudge otherwise. */
  isOwner: boolean;
  /** Compact rows for the profile page; roomier ones for the full list. */
  compact?: boolean;
}

export default function MatchHistoryList({
  matches,
  slug,
  isOwner,
  compact = false,
}: MatchHistoryListProps) {
  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-default p-6 text-center text-xs text-text-muted">
        No completed matches yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {matches.map((match) => {
        const mode = modeStyles[match.mode];
        const pending = pendingReviews(match);

        return (
          <li key={match.id}>
            <Link
              href={`/profile/${slug}/matches/${match.id}`}
              className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-page p-3 transition-colors hover:border-border-strong"
            >
              {!compact && (
                <div className="relative hidden size-12 shrink-0 overflow-hidden rounded-lg sm:block">
                  <Image
                    src={match.cover}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold text-white">
                    {match.lobbyName}
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${mode.className}`}
                  >
                    {mode.label}
                  </span>
                  {match.viewerWasLeader && (
                    <span className="shrink-0 rounded bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">
                      Leader
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-text-muted">
                  <span>{match.lobbyType}</span>
                  <span>•</span>
                  <span>{match.duration}</span>
                  {isOwner && pending.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-star">
                        {pending.length} teammate
                        {pending.length === 1 ? "" : "s"} not rated
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center">
                {match.teammates.slice(0, 3).map((teammate) => (
                  // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
                  <img
                    key={teammate.id}
                    src={teammate.avatar}
                    alt=""
                    className="-ml-2 size-7 rounded-full border-2 border-bg-page object-cover first:ml-0"
                  />
                ))}
                {match.teammates.length > 3 && (
                  <div className="-ml-2 flex size-7 items-center justify-center rounded-full border-2 border-bg-page bg-white/10 text-[10px] font-bold text-white">
                    +{match.teammates.length - 3}
                  </div>
                )}
              </div>

              <span className="w-[76px] shrink-0 text-right text-[11px] text-text-muted">
                {match.endedAgo}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
