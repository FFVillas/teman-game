"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { usePush } from "@/lib/push";

const DISMISSED_KEY = "temangame:push-prompt-dismissed";
/** "Not now" keeps it away this long before asking once more. */
const ASK_AGAIN_AFTER_DAYS = 14;
/** Let the page settle before asking. */
const DELAY_MS = 2500;

/** Pages where the question would interrupt something else. */
const QUIET_PATHS = ["/onboarding", "/settings", "/login", "/signup", "/admin", "/account-restricted", "/reset-password", "/forgot-password", "/offline"];

function dismissedRecently(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0);
    return Date.now() - at < ASK_AGAIN_AFTER_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Asks a signed-in player, once, whether to turn on push for this device, so
 * nobody has to find it in Settings. A small card in the app rather than the
 * browser's own dialog straight away: Safari on iPhone only shows that dialog
 * after a tap, and Chrome quietly blocks sites that ask on load. "Turn on"
 * is that tap; "Not now" waits two weeks before asking again.
 *
 * Shown only where push can work: not on iPhone Safari outside the installed
 * app (Settings explains that one), not once permission was given or refused.
 */
export default function PushPrompt() {
  const { user, isReady, isAdmin } = useAuth();
  const pathname = usePathname();
  const { state, busy, turnOn } = usePush(createClient);
  const [visible, setVisible] = useState(false);

  const eligible =
    isReady &&
    Boolean(user) &&
    !isAdmin &&
    state === "off" &&
    !QUIET_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    if (!eligible || dismissedRecently()) return;
    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible]);

  if (!visible || !eligible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Private mode: it may ask again next visit, which is fine.
    }
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Turn on notifications"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[420px] rounded-2xl border border-border-strong bg-bg-card-alt p-4 shadow-2xl shadow-black/60 sm:bottom-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <path d="M4 6.5a4 4 0 0 1 8 0c0 3.5 1.5 4.5 1.5 4.5h-11S4 10 4 6.5ZM6.5 13.5a1.6 1.6 0 0 0 3 0" />
          </svg>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-bold text-white">Get notified on this device?</p>
          <p className="text-xs leading-relaxed text-text-muted">
            Know when someone invites you, accepts your request or messages you, even with
            TemanGame closed.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                await turnOn();
                setVisible(false);
              }}
              className="flex h-9 items-center justify-center rounded-lg bg-brand px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Turning on…" : "Turn on"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold text-text-muted transition-colors hover:text-white"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
