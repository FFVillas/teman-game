"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Pop-up for a lobby decision that can't be taken back (end, close, leave
 * after it started). Escape and the backdrop cancel, except while the action
 * is running.
 */
export default function ConfirmDialog({
  title,
  body,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  body: ReactNode;
  /** Extra content under the body, e.g. a warning box. */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
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
          <p className="text-xs leading-relaxed text-text-muted">{body}</p>
        </div>

        {children}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex h-10 items-center justify-center rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-muted transition-colors hover:text-white disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex h-10 items-center justify-center rounded-lg bg-danger px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
