"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

/**
 * Pop-up before the leader closes or ends a lobby. Ending is final for
 * everyone (the chat closes, nobody can join), and ending one that ran under
 * the minimum (`minLobbyMinutes`: `app_setting`, the same row `can_review`
 * reads; 15 in production, 5 in the study) also means no one can rate anyone — the database refuses it, and
 * finding that out only on the rating screen is too late. So the dialog says
 * so, and how long is left, while the leader can still wait.
 */
export default function EndLobbyDialog({
  started,
  startedAt,
  minLobbyMinutes,
  busy,
  onConfirm,
  onClose,
}: {
  started: boolean;
  startedAt?: string | null;
  minLobbyMinutes: number;
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

  const minPlayMs = minLobbyMinutes * 60_000;
  const playedMs = started && startedAt ? now - new Date(startedAt).getTime() : null;
  const tooShort = playedMs !== null && playedMs < minPlayMs;
  const minutesLeft =
    playedMs !== null ? Math.max(1, Math.ceil((minPlayMs - playedMs) / 60_000)) : 0;

  return (
    <ConfirmDialog
      title={started ? "End this lobby?" : "Close this lobby?"}
      body={
        started
          ? "It ends for everyone: the chat closes and the lobby moves to everyone's match history."
          : "It closes for everyone and no longer accepts applications. Pending requests and invites are dropped."
      }
      confirmLabel={tooShort ? "End anyway" : started ? "End lobby" : "Close lobby"}
      cancelLabel={tooShort ? "Keep playing" : "Cancel"}
      busy={busy}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      {tooShort && (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3"
        >
          <p className="text-xs font-bold text-warning">
            Ratings won&apos;t open until {minLobbyMinutes} minutes
          </p>
          <p className="text-xs leading-relaxed text-text-subtle">
            Wait <span className="font-bold text-white">{minutesLeft} more min</span> so
            everyone can rate each other.
          </p>
        </div>
      )}
    </ConfirmDialog>
  );
}
