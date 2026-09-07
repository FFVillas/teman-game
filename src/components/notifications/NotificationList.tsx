"use client";

import Link from "next/link";
import { useNotifications } from "@/contexts/NotificationContext";
import { notificationStyles, type AppNotification } from "@/data/notifications";

const toneRing: Record<string, string> = {
  brand: "border-brand/30 bg-brand/10",
  success: "border-success/30 bg-success/10",
  star: "border-star/30 bg-star/10",
  danger: "border-danger/30 bg-danger/10",
};

function Row({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
}) {
  const style = notificationStyles[notification.kind];

  const body = (
    <>
      {notification.actorAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
        <img
          src={notification.actorAvatar}
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${toneRing[style.tone]}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src={style.icon} alt="" className="size-4" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-bold text-white">
          {notification.title}
        </span>
        {notification.body && (
          <span className="text-xs leading-relaxed text-text-muted">
            {notification.body}
          </span>
        )}
        <span className="pt-0.5 text-[11px] text-text-muted">
          {notification.createdAgo}
        </span>
      </div>

      {!notification.read && (
        <span
          aria-label="Unread"
          className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
        />
      )}
    </>
  );

  const className = `flex items-start gap-3 rounded-xl border p-4 transition-colors ${
    notification.read
      ? "border-border-default bg-bg-page hover:border-border-strong"
      : "border-brand/25 bg-brand/[0.04] hover:border-brand/50"
  }`;

  if (!notification.href) {
    return <li className={className}>{body}</li>;
  }

  return (
    <li>
      <Link
        href={notification.href}
        onClick={() => onRead(notification.id)}
        className={className}
      >
        {body}
      </Link>
    </li>
  );
}

export default function NotificationList() {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-strong bg-bg-card-alt p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Notifications
          </h1>
          <p className="text-xs text-text-muted">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "You're all caught up."}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="flex h-9 items-center justify-center rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-muted transition-colors hover:text-white"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-default p-8 text-center text-xs text-text-muted">
          Nothing here yet. Join requests, invites and reviews will show up on
          this page.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <Row
              key={notification.id}
              notification={notification}
              onRead={markRead}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
