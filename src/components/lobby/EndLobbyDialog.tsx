"use client";

import { useEffect, useState } from "react";

/** Same as `submit_review`'s rule (20261116000200_reviews.sql). */
const MIN_PLAY_MS = 15 * 60 * 1000;

/**
 * Pop-up before the leader closes or ends a lobby. Ending is final for
 * everyone (the chat closes, nobody can join), and ending one that ran under
 * 15 minutes also means no one can rate anyone — the database refuses it, and
 * finding that out only on the rating screen is too late. So the dialog says
 * so, and how long is left, while the leader can still wait.
 */
export default function EndLobbyDialog({
  started,
  startedAt,
  busy,
  onConfirm,
  onClose,
}: {
  started: boolean;
  startedAt?: string | null;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  // Ticks so the "x minutes left" line stays right while the dialog is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [busy, onClose]);

  const playedMs = started && startedAt ? now - new Date(startedAt).getTime() : null;
  const tooShort = playedMs !== null && playedMs < MIN_PLAY_MS;
  const minutesLeft =
    playedMs !== null ? Math.max(1, Math.ceil((MIN_PLAY_MS - playedMs) / 60_000)) : 0;

  const title = started ? "End this lobby?" : "Close this lobby?";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={busy ? undefined : onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-[440px] flex-col gap-4 rounded-2xl border border-border-strong bg-bg-card-alt p-6"
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-lg font-extrabold text-white">{title}</h2>
          <p className="text-xs leading-relaxed text-text-muted">
            {started
              ? "It ends for everyone: the chat closes and the lobby moves to everyone's match history."
              : "It closes for everyone and no longer accepts applications. Pending requests and invites are dropped."}
          </p>
        </div>

        {tooShort && (
          <div
            role="alert"
            className="flex flex-col gap-1 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3"
          >
            <p className="text-xs font-bold text-warning">
              Ratings won&apos;t open until 15 minutes
            </p>
            <p className="text-xs leading-relaxed text-text-subtle">
              Wait <span className="font-bold text-white">{minutesLeft} more min</span> so
              everyone can rate each other.
            </p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex h-10 items-center justify-center rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-muted transition-colors hover:text-white disabled:opacity-50"
          >
            {tooShort ? "Keep playing" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex h-10 items-center justify-center rounded-lg bg-danger px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy
              ? "Working…"
              : tooShort
                ? "End anyway"
                : started
                  ? "End lobby"
                  : "Close lobby"}
          </button>
        </div>
      </div>
    </div>
  );
}
