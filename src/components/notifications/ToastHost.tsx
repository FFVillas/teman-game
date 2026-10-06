"use client";

import Link from "next/link";
import {
  useNotifications,
  TOAST_MS,
  type ToastTone,
} from "@/contexts/NotificationContext";

const toneStyles: Record<
  ToastTone,
  { icon: string; ring: string; bar: string }
> = {
  success: {
    icon: "/icons/auth-check.svg",
    ring: "border-success/30 bg-success/10",
    bar: "bg-success",
  },
  info: {
    icon: "/icons/nav-bell.svg",
    ring: "border-brand/30 bg-brand/10",
    bar: "bg-brand",
  },
  danger: {
    icon: "/icons/action-decline.svg",
    ring: "border-danger/30 bg-danger/10",
    bar: "bg-danger",
  },
};

/**
 * Fixed toast stack, mounted once in the root layout. Toasts confirm an
 * action the user just took; incoming events go through `notify()`, which
 * also files them on /notifications.
 *
 * Each one carries a countdown bar matching the auto-dismiss timer, so a
 * toast disappearing reads as "time's up" rather than as a glitch — and
 * anyone mid-sentence can see how long they have to click through.
 */
export default function ToastHost() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      {toasts.map((toast) => {
        const tone = toneStyles[toast.tone];
        const inner = (
          <>
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${tone.ring}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src={tone.icon} alt="" className="size-3.5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs font-bold text-white">{toast.title}</span>
              {toast.body && (
                <span className="text-[11px] leading-relaxed text-text-muted">
                  {toast.body}
                </span>
              )}
              {toast.href && (
                <span className="pt-0.5 text-[11px] font-semibold text-brand">
                  View
                </span>
              )}
            </div>
          </>
        );

        return (
          <div
            key={toast.id}
            role="status"
            className="toast-enter pointer-events-auto relative w-full max-w-[340px] overflow-hidden rounded-xl border border-border-strong bg-bg-card-alt shadow-xl shadow-black/40"
          >
            <div className="flex items-start gap-3 p-3">
              {toast.href ? (
                <Link
                  href={toast.href}
                  onClick={() => dismissToast(toast.id)}
                  className="flex min-w-0 flex-1 items-start gap-3"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {inner}
                </div>
              )}
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss"
                className="shrink-0 text-base leading-none text-text-muted transition-colors hover:text-white"
              >
                &times;
              </button>
            </div>

            <span
              aria-hidden
              className={`toast-countdown absolute inset-x-0 bottom-0 h-0.5 ${tone.bar}`}
              style={{ animationDuration: `${TOAST_MS}ms` }}
            />
          </div>
        );
      })}
    </div>
  );
}
