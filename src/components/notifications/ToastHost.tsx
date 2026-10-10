"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  useNotifications,
  TOAST_MS,
  type Toast,
  type ToastTone,
} from "@/contexts/NotificationContext";
import { respondToApplication, respondToInvite } from "@/lib/lobbies";
import { answerFriendRequestFrom } from "@/lib/social";
import { createClient } from "@/lib/supabase/client";

// The icon circle is a solid colour per tone: green for done, blue for
// information, red for something that went wrong. The card itself stays dark.
const toneStyles: Record<ToastTone, { circle: string; bar: string }> = {
  success: { circle: "bg-success", bar: "bg-success" },
  info: { circle: "bg-brand", bar: "bg-brand" },
  danger: { circle: "bg-danger", bar: "bg-danger" },
};

/**
 * The white mark in the circle. Drawn as strokes rather than loaded from the
 * shared icon files, so the check and the cross can be sized, weighted and
 * centred for this circle without touching the auth and decline icons used
 * elsewhere. Both are centred on the viewBox's middle (8, 8).
 */
function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "info") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization
      <img src="/icons/nav-bell.svg" alt="" className="h-3.5 w-auto" />
    );
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-[18px]"
      fill="none"
      stroke="white"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={tone === "success" ? 2.25 : 2.5}
    >
      {tone === "success" ? (
        <path d="M3.25 8l3.25 3.25 6.25-6.5" />
      ) : (
        <path d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
      )}
    </svg>
  );
}

/**
 * One pop-up. Split out of the host so the design gallery can draw the real
 * thing. With `onAnswer` and `toast.action` it shows Accept / Decline.
 */
export function ToastCard({
  toast,
  onDismiss,
  onAnswer,
  busy = false,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
  onAnswer?: (accept: boolean) => void;
  busy?: boolean;
}) {
  const tone = toneStyles[toast.tone];
  const answerable = Boolean(toast.action && onAnswer);

  const text = (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-xs font-bold text-white">{toast.title}</span>
      {toast.body && (
        // Two lines at most, then an ellipsis, so a long message can't make
        // the pop-up grow without limit.
        <span className="line-clamp-2 break-words text-[11px] leading-relaxed text-text-muted">
          {toast.body}
        </span>
      )}
    </div>
  );

  const body = (
    <>
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${tone.circle}`}
      >
        <ToastIcon tone={toast.tone} />
      </span>
      {text}
    </>
  );

  return (
    // A pop-up with a related page is a link as a whole: clicking anywhere on
    // it (except the buttons and the ×) goes there and closes it. The link is
    // the text, stretched over the card; the buttons sit above it.
    <div
      role="status"
      className={`toast-enter pointer-events-auto relative w-full max-w-[340px] overflow-hidden rounded-xl border border-border-strong bg-bg-card-alt shadow-xl shadow-black/40 ${
        toast.href ? "transition-colors hover:border-white/30" : ""
      }`}
    >
      <div className="flex items-start gap-3 p-3 pb-3.5">
        {toast.href ? (
          <Link
            href={toast.href}
            onClick={() => onDismiss(toast.id)}
            className="flex min-w-0 flex-1 items-start gap-3 after:absolute after:inset-0 after:content-['']"
          >
            {body}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>
        )}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss"
          className="relative z-10 shrink-0 text-base leading-none text-text-muted transition-colors hover:text-white"
        >
          &times;
        </button>
      </div>

      {answerable && (
        // Under the text, indented to line up with it (icon 32px + gap 12px).
        <div className="relative z-10 flex items-center gap-2 px-3 pb-3.5 pl-[56px]">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAnswer?.(true)}
            className="flex h-8 items-center justify-center rounded-lg bg-brand px-4 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAnswer?.(false)}
            className="flex h-8 items-center justify-center rounded-lg border border-border-strong px-4 text-[11px] font-semibold text-text-muted transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}

      <span
        aria-hidden
        className={`toast-countdown absolute inset-x-0 bottom-0 h-0.5 ${tone.bar}`}
        style={{ animationDuration: `${toast.duration ?? TOAST_MS}ms` }}
      />
    </div>
  );
}

const failureTitle = {
  lobby_invite: "Couldn't answer this invitation",
  join_request: "Couldn't answer this request",
  friend_request: "Couldn't answer this friend request",
} as const;

/**
 * Fixed toast stack, mounted once in the root layout. Two sources feed it:
 * `toast()` (a confirmation or an error from something you just did) and
 * incoming notifications, which arrive over realtime and are turned into
 * pop-ups by the notification context. Invites, join requests and friend
 * requests carry Accept / Decline, answered here.
 *
 * Each one carries a countdown bar matching the auto-dismiss timer, so a
 * toast disappearing reads as "time's up" rather than as a glitch — and
 * anyone mid-sentence can see how long they have to click through.
 */
export default function ToastHost() {
  const { toasts, dismissToast, toast: showToast, resolve, markRead } =
    useNotifications();
  const { user } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function answer(toast: Toast, accept: boolean) {
    const action = toast.action;
    if (!action || !user || busyId) return;
    setBusyId(toast.id);

    const supabase = createClient();
    let failure: string | null = null;
    if (action.kind === "lobby_invite" && action.refId) {
      failure = await respondToInvite(supabase, action.refId, accept);
    } else if (action.kind === "join_request" && action.refId) {
      failure = await respondToApplication(supabase, action.refId, accept);
    } else if (action.kind === "friend_request" && action.actorId) {
      const ok = await answerFriendRequestFrom(supabase, action.actorId, user.id, accept);
      failure = ok ? null : "That request is no longer there.";
    } else {
      failure = "Open it from your notifications instead.";
    }

    setBusyId(null);
    dismissToast(toast.id);
    if (failure) {
      showToast({ tone: "danger", title: failureTitle[action.kind], body: failure });
      return;
    }
    // No confirmation pop-up: the notification list shows the outcome.
    if (action.kind === "friend_request") markRead(action.notificationId);
    else resolve(action.notificationId, accept ? "accepted" : "declined");
  }

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
          onAnswer={toast.action ? (accept) => answer(toast, accept) : undefined}
          busy={busyId === toast.id}
        />
      ))}
    </div>
  );
}
