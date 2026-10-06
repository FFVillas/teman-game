"use client";

import Link from "next/link";
import { useNotifications } from "@/contexts/NotificationContext";

/**
 * Navbar entry point. Clicking always goes to /notifications rather than
 * opening a dropdown — the full list is the one place notifications live.
 */
export default function NotificationBell() {
  const { unreadCount } = useNotifications();

  return (
    <Link
      href="/notifications"
      aria-label={
        unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
      }
      className="relative flex size-8 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
      <img src="/icons/nav-bell.svg" alt="" className="h-5 w-auto" />
      {unreadCount > 0 && (
        // Same treatment as the messages badge: it sits on the bell, not
        // beside it, so the two read as one pattern.
        <span className="absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-bg-nav bg-brand px-1 text-[9px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
