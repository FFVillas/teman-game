"use client";

import Link from "next/link";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  isActionable,
  notificationStyles,
  type AppNotification,
} from "@/data/notifications";

const toneRing: Record<string, string> = {
  brand: "border-brand/30 bg-brand/10",
  success: "border-success/30 bg-success/10",
  star: "border-star/30 bg-star/10",
  danger: "border-danger/30 bg-danger/10",
};

/**
 * Accept / decline straight from the row, so an invite or a join request
 * doesn't need a trip to the lobby page to answer.
 */
function ActionButtons({
  notification,
  onResolve,
}: {
  notification: AppNotification;
  onResolve: (resolution: "accepted" | "declined") => void;
}) {
  const isInvite = notification.kind === "lobby_invite";

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => onResolve("accepted")}
        aria-label={isInvite ? "Accept invitation" : "Accept request"}
        title={isInvite ? "Accept invitation" : "Accept request"}
        className="flex size-8 items-center justify-center rounded-lg bg-brand transition-opacity hover:opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/action-accept.svg" alt="" className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onResolve("declined")}
        aria-label={isInvite ? "Decline invitation" : "Decline request"}
        title={isInvite ? "Decline invitation" : "Decline request"}
        className="flex size-8 items-center justify-center rounded-lg border border-border-strong text-text-muted transition-colors hover:border-danger hover:text-danger"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/action-decline.svg" alt="" className="size-3.5" />
      </button>
    </div>
  );
}

function Row({ notification }: { notification: AppNotification }) {
  const { markRead, resolve, toast } = useNotifications();
  const style = notificationStyles[notification.kind];
  const actionable = isActionable(notification);

  function handleResolve(resolution: "accepted" | "declined") {
    // TODO: PATCH the underlying application / invite row.
    resolve(notification.id, resolution);
    toast({
      tone: resolution === "accepted" ? "success" : "info",
      title:
        resolution === "accepted"
          ? notification.kind === "lobby_invite"
            ? "Invitation accepted"
            : "Request accepted"
          : notification.kind === "lobby_invite"
            ? "Invitation declined"
            : "Request declined",
      body: notification.actorName
        ? `${notification.actorName} has been notified.`
        : undefined,
      href: resolution === "accepted" ? notification.href : undefined,
    });
  }

  const inner = (
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
    </>
  );

  const className = `flex items-start gap-3 rounded-xl border p-4 transition-colors ${
    notification.read
      ? "border-border-default bg-bg-page"
      : "border-brand/25 bg-brand/[0.04]"
  }`;

  return (
    <li className={className}>
      {notification.href && !actionable ? (
        <Link
          href={notification.href}
          onClick={() => markRead(notification.id)}
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{inner}</div>
      )}

      {actionable ? (
        <ActionButtons notification={notification} onResolve={handleResolve} />
      ) : notification.resolution ? (
        <span
          className={`mt-1 shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
            notification.resolution === "accepted"
              ? "bg-success/10 text-success"
              : "bg-white/5 text-text-muted"
          }`}
        >
          {notification.resolution}
        </span>
      ) : !notification.read ? (
        <span
          aria-label="Unread"
          className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
        />
      ) : null}
    </li>
  );
}

export default function NotificationList() {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-strong bg-bg-card-alt p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Notifications
          </h1>
          <p className="text-xs text-text-muted">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
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
            <Row key={notification.id} notification={notification} />
          ))}
        </ul>
      )}
    </div>
  );
}
