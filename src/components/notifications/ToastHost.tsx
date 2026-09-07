"use client";

import Link from "next/link";
import { useNotifications, type ToastTone } from "@/contexts/NotificationContext";

const toneStyles: Record<ToastTone, { bar: string; icon: string }> = {
  success: { bar: "bg-success", icon: "/icons/auth-check.svg" },
  info: { bar: "bg-brand", icon: "/icons/nav-bell.svg" },
  danger: { bar: "bg-danger", icon: "/icons/nav-bell.svg" },
};

/**
 * Fixed toast stack, mounted once in the root layout. Toasts confirm an
 * action the user just took; incoming events go through `notify()`, which
 * also files them on /notifications.
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
            <span className={`w-1 shrink-0 self-stretch rounded-full ${tone.bar}`} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs font-bold text-white">{toast.title}</span>
              {toast.body && (
                <span className="text-[11px] leading-relaxed text-text-muted">
                  {toast.body}
                </span>
              )}
            </div>
          </>
        );

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-[340px] items-start gap-3 rounded-xl border border-border-strong bg-bg-card-alt p-3 shadow-xl shadow-black/40"
          >
            {toast.href ? (
              <Link
                href={toast.href}
                onClick={() => dismissToast(toast.id)}
                className="flex min-w-0 flex-1 items-start gap-3"
              >
                {inner}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-start gap-3">{inner}</div>
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
        );
      })}
    </div>
  );
}
