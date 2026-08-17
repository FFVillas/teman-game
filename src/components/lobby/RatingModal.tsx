"use client";

import { useEffect, useState } from "react";
import StarRating from "./StarRating";
import ReportForm from "./ReportForm";
import {
  reviewTags,
  type ReportTarget,
  type ReportSubmission,
} from "@/data/lfg-lobby";

export interface LobbyReview {
  targetId: string;
  stars: number;
  tags: string[];
}

interface RatingModalProps {
  /**
   * Everyone except the reviewer — you don't rate yourself. Typed loosely so
   * the same queue works for a live lobby's members and for teammates pulled
   * from a finished match in history.
   */
  teammates: ReportTarget[];
  lobbyName: string;
  game: string;
  lobbyId?: string;
  onClose: () => void;
  onComplete: (reviews: LobbyReview[], reports: ReportSubmission[]) => void;
}

/**
 * Steps through teammates one at a time rather than stacking a popup per
 * person — same "1 / 3" queue as the Figma review design. Closes the loop in
 * Activity Diagram 3: end lobby → rate → reputation recalculated.
 */
export default function RatingModal({
  teammates,
  lobbyName,
  game,
  lobbyId,
  onClose,
  onComplete,
}: RatingModalProps) {
  const [index, setIndex] = useState(0);
  const [reviews, setReviews] = useState<LobbyReview[]>([]);
  const [reports, setReports] = useState<ReportSubmission[]>([]);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const player = teammates[index];
  if (!player) return null;

  const isLast = index === teammates.length - 1;

  function resetForNext() {
    setStars(0);
    setTags([]);
    setReporting(false);
  }

  /** Move to the next teammate, or finish if this was the last one. */
  function advance(nextReviews: LobbyReview[], nextReports: ReportSubmission[]) {
    if (isLast) {
      onComplete(nextReviews, nextReports);
      return;
    }
    setReviews(nextReviews);
    setReports(nextReports);
    setIndex((i) => i + 1);
    resetForNext();
  }

  function commit(skip = false) {
    const nextReviews = skip
      ? reviews
      : [...reviews, { targetId: player.id, stars, tags }];
    advance(nextReviews, reports);
  }

  function submitReport(report: ReportSubmission) {
    advance(reviews, [...reports, report]);
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Rate ${player.name}`}
        className="flex max-h-[95vh] w-full max-w-[520px] flex-col gap-5 overflow-y-auto rounded-2xl border border-border-strong bg-bg-card-alt p-6"
      >
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- avatar thumbnail, no benefit from next/image optimization */}
          <img
            src={player.avatar}
            alt=""
            className="size-16 shrink-0 rounded-full border-2 border-border-strong object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">{player.name}</h2>
              {player.rank && (
                <>
                  <span className="text-text-muted">•</span>
                  <span className="flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization */}
                    <img src={player.rank.icon} alt="" className="size-3.5" />
                    <span
                      className={`text-xs font-bold ${player.rank.colorClass}`}
                    >
                      {player.rank.name}
                    </span>
                  </span>
                </>
              )}
            </div>
            <p className="truncate text-sm text-text-muted">{lobbyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-2xl leading-none text-text-muted transition-colors hover:text-white"
          >
            ×
          </button>
        </div>

        {reporting ? (
          <ReportForm
            player={player}
            game={game}
            lobbyId={lobbyId}
            onCancel={() => setReporting(false)}
            onSubmit={submitReport}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-text-muted">Rate the player</span>
              <StarRating value={stars} onChange={setStars} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Add tags
              </span>
              <div className="flex flex-wrap gap-2">
                {reviewTags.map((tag) => {
                  const isSelected = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={isSelected}
                      className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                        isSelected
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border-strong text-text-muted hover:border-white/30"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReporting(true)}
              className="w-fit text-[11px] font-semibold text-text-muted underline-offset-2 transition-colors hover:text-danger hover:underline"
            >
              Report this player instead
            </button>
          </>
        )}

        {/* ReportForm brings its own Cancel / Submit, so the queue footer
            steps aside while a report is being written. */}
        {!reporting && (
          <div className="flex items-center justify-between gap-4 border-t border-border-subtle pt-4">
            <span className="text-xs text-text-muted">
              {index + 1} / {teammates.length}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => commit(true)}
                className="text-xs font-semibold text-text-muted transition-colors hover:text-white"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => commit()}
                disabled={stars === 0}
                className="flex h-10 items-center justify-center rounded-lg bg-brand px-6 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLast ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
