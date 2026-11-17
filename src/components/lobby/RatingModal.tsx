"use client";

import { useEffect, useState } from "react";
import StarRating from "./StarRating";
import ReportForm from "./ReportForm";
import UserAvatar from "@/components/UserAvatar";
import {
  reviewTags,
  type ReportTarget,
  type ReportSubmission,
} from "@/data/lfg-lobby";
import {
  LOW_RATING_MAX,
  lowRatingReasons,
  type LowRatingReason,
} from "@/data/review-options";

export interface LobbyReview {
  targetId: string;
  stars: number;
  /** Required for 1–2 stars; never part of the score. */
  reason: LowRatingReason | null;
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
  /** The tags to offer for a teammate, in order. Defaults to the mock list. */
  tagsFor?: (teammateId: string) => string[];
  /**
   * Save as you go (real lobbies). Each returns an error message or null; on
   * an error the queue stays on that teammate. Without them, the queue only
   * collects and hands everything to `onComplete` (mock lobbies).
   */
  onSaveReview?: (review: LobbyReview) => Promise<string | null>;
  onSaveReport?: (report: ReportSubmission) => Promise<string | null>;
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
  tagsFor,
  onSaveReview,
  onSaveReport,
}: RatingModalProps) {
  const [index, setIndex] = useState(0);
  const [reviews, setReviews] = useState<LobbyReview[]>([]);
  const [reports, setReports] = useState<ReportSubmission[]>([]);
  const [stars, setStars] = useState(0);
  const [reason, setReason] = useState<LowRatingReason | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [reporting, setReporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const needsReason = stars > 0 && stars <= LOW_RATING_MAX;
  const tagOptions = tagsFor?.(player.id) ?? reviewTags;

  function resetForNext() {
    setStars(0);
    setReason(null);
    setTags([]);
    setReporting(false);
    setError(null);
  }

  function pickStars(value: number) {
    setStars(value);
    if (value > LOW_RATING_MAX) setReason(null);
  }

  async function save<T>(item: T, write?: (item: T) => Promise<string | null>) {
    if (!write) return true;
    setSaving(true);
    setError(null);
    const failure = await write(item);
    setSaving(false);
    if (failure) setError(failure);
    return !failure;
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

  async function commit(skip = false) {
    if (skip) {
      advance(reviews, reports);
      return;
    }
    const review: LobbyReview = { targetId: player.id, stars, reason, tags };
    if (await save(review, onSaveReview)) advance([...reviews, review], reports);
  }

  async function submitReport(report: ReportSubmission) {
    if (await save(report, onSaveReport)) advance(reviews, [...reports, report]);
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
        className="flex max-h-[95dvh] w-full max-w-[520px] flex-col gap-5 overflow-y-auto rounded-2xl border border-border-strong bg-bg-card-alt p-6"
      >
        <div className="flex items-start gap-4">
          <UserAvatar
            src={player.avatar}
            name={player.name}
            className="size-16 border-2 border-border-strong"
            textClassName="text-xl"
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
              <StarRating value={stars} onChange={pickStars} />
              <p className="text-[11px] leading-relaxed text-text-muted">
                Ratings are anonymous. Their score updates once everyone has
                rated, or after 48 hours.
              </p>
            </div>

            {needsReason && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                  What went wrong? <span className="text-danger">*</span>
                </span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Reason">
                  {lowRatingReasons.map((option) => {
                    const isSelected = reason === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setReason(option.value)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                          isSelected
                            ? "border-danger bg-danger/10 text-danger"
                            : "border-border-strong text-text-muted hover:border-white/30"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-text-muted">
                  Required for 1 or 2 stars. It doesn&apos;t change the score; moderators see it.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Add tags
              </span>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => {
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

        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
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
                disabled={saving}
                className="text-xs font-semibold text-text-muted transition-colors hover:text-white disabled:opacity-40"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => commit()}
                disabled={stars === 0 || (needsReason && !reason) || saving}
                className="flex h-10 items-center justify-center rounded-lg bg-brand px-6 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Saving…" : isLast ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
