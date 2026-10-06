"use client";

import { useState } from "react";
import Link from "next/link";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  isActionable,
  notificationStyles,
  type AppNotification,
} from "@/data/notifications";
import { EmptyState } from "@/components/EmptyState";

const toneSolid: Record<string, string> = {
  brand: "border-brand bg-brand",
  success: "border-success bg-success",
  star: "border-star bg-star",
  danger: "border-danger bg-danger",
};

type Filter = "all" | "unread" | "requests";

const filterLabels: Record<Filter, string> = {
  all: "All",
  unread: "Unread",
  requests: "Needs a reply",
};

function matchesFilter(notification: AppNotification, filter: Filter) {
  if (filter === "unread") return !notification.read;
  if (filter === "requests") return isActionable(notification);
  return true;
}

/**
 * Accept / decline straight from the row, so an invite or a join request
 * doesn't need a trip to the lobby page to answer. Labelled rather than
 * icon-only from `sm` up — a tick and a cross alone are easy to misread when
 * the consequence is joining or refusing a lobby.
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
        className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand px-2.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/action-accept.svg" alt="" className="size-3" />
        <span className="hidden sm:inline">Accept</span>
      </button>
      <button
        type="button"
        onClick={() => onResolve("declined")}
        aria-label={isInvite ? "Decline invitation" : "Decline request"}
        className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-danger px-2.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/action-decline.svg" alt="" className="size-3" />
        <span className="hidden sm:inline">Decline</span>
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
      <div className="relative shrink-0">
        {notification.actorAvatar ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
            <img
              src={notification.actorAvatar}
              alt=""
              className="size-10 rounded-full object-cover"
            />
            {/* The kind icon rides the avatar, so you can tell an invite
                from a review without reading either. */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full border border-bg-card-alt ${toneSolid[style.tone]}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src={style.icon} alt="" className="h-2.5 w-auto brightness-0 invert" />
            </span>
          </>
        ) : (
          <div
            className={`flex size-10 items-center justify-center rounded-full border ${toneSolid[style.tone]}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src={style.icon} alt="" className="h-4 w-auto brightness-0 invert" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 text-sm font-bold text-white">
            {notification.title}
          </span>
          <span className="shrink-0 text-[11px] text-text-muted">
            {notification.createdAgo}
          </span>
        </div>
        {notification.body && (
          <span className="text-xs leading-relaxed text-text-muted">
            {notification.body}
          </span>
        )}
      </div>
    </>
  );

  return (
    <li
      className={`relative flex items-start gap-3 overflow-hidden rounded-xl border p-4 pl-5 transition-colors ${
        notification.read
          ? "border-border-default bg-bg-page hover:border-border-strong"
          : "border-brand/25 bg-brand/[0.04] hover:border-brand/50"
      }`}
    >
      {/* Unread marker as an edge bar rather than a dot: it survives a long
          title wrapping, and it lines the unread ones up down the list. */}
      {!notification.read && (
        <span
          aria-label="Unread"
          className="absolute inset-y-0 left-0 w-1 bg-brand"
        />
      )}

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
      ) : null}
    </li>
  );
}

export default function NotificationList() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const counts: Record<Filter, number> = {
    all: notifications.length,
    unread: unreadCount,
    requests: notifications.filter(isActionable).length,
  };
  const visible = notifications.filter((n) => matchesFilter(n, filter));

  const emptyCopy: Record<Filter, { title: string; description: string }> = {
    all: {
      title: "Nothing here yet",
      description:
        "Join requests, lobby invites, reviews and moderation updates land on this page.",
    },
    unread: {
      title: "You're all caught up",
      description: "Every notification has been read.",
    },
    requests: {
      title: "Nothing waiting on you",
      description:
        "Join requests and lobby invites appear here until you accept or decline them.",
    },
  };

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

      {/* Three filters rather than a long undifferentiated list: the one
          thing people come here to do is answer what's waiting on them. */}
      <div role="tablist" className="flex flex-wrap gap-1.5">
        {(Object.keys(filterLabels) as Filter[]).map((key) => {
          const selected = key === filter;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(key)}
              className={`flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                selected
                  ? "border-brand/50 bg-brand/10 text-white"
                  : "border-border-default text-text-muted hover:border-border-strong hover:text-white"
              }`}
            >
              {filterLabels[key]}
              {counts[key] > 0 && (
                <span
                  className={`text-[11px] ${selected ? "text-brand" : "text-text-muted"}`}
                >
                  {counts[key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="/icons/nav-bell.svg"
          title={emptyCopy[filter].title}
          description={emptyCopy[filter].description}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((notification) => (
            <Row key={notification.id} notification={notification} />
          ))}
        </ul>
      )}
    </div>
  );
}
