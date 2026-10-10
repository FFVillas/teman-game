"use client";

import { useState } from "react";
import Link from "next/link";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  gameOfNotification,
  isActionable,
  notificationStyles,
  titleSegments,
  type AppNotification,
} from "@/data/notifications";
import { EmptyState } from "@/components/EmptyState";
import { respondToApplication, respondToInvite } from "@/lib/lobbies";
import { createClient } from "@/lib/supabase/client";

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
  busy,
}: {
  notification: AppNotification;
  onResolve: (resolution: "accepted" | "declined") => void;
  busy: boolean;
}) {
  const isInvite = notification.kind === "lobby_invite";

  return (
    // Under the text, not beside it: the right edge is left to the time, so
    // the time sits in the same place on every row.
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => onResolve("accepted")}
        disabled={busy}
        aria-label={isInvite ? "Accept invitation" : "Accept request"}
        className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/action-accept.svg" alt="" className="size-3" />
        Accept
      </button>
      <button
        type="button"
        onClick={() => onResolve("declined")}
        disabled={busy}
        aria-label={isInvite ? "Decline invitation" : "Decline request"}
        className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-danger px-3 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/action-decline.svg" alt="" className="size-3" />
        Decline
      </button>
    </div>
  );
}

export function Row({ notification }: { notification: AppNotification }) {
  const { markRead, resolve, toast } = useNotifications();
  const style = notificationStyles[notification.kind];
  const actionable = isActionable(notification);
  const game = gameOfNotification(notification);
  const [busy, setBusy] = useState(false);

  async function handleResolve(resolution: "accepted" | "declined") {
    if (busy) return;

    // Both kinds are real rows: answer the application or the invite first.
    // The database then marks this notification itself, and refuses when the
    // answer no longer holds (the lobby filled up, the player no longer
    // fits, you're already in another lobby), in which case nothing is
    // resolved and the reason is shown.
    if (notification.refId) {
      setBusy(true);
      const accept = resolution === "accepted";
      const failure =
        notification.kind === "lobby_invite"
          ? await respondToInvite(createClient(), notification.refId, accept)
          : await respondToApplication(createClient(), notification.refId, accept);
      setBusy(false);
      if (failure) {
        toast({
          tone: "danger",
          title:
            notification.kind === "lobby_invite"
              ? "Couldn't answer this invitation"
              : "Couldn't answer this request",
          body: failure,
        });
        return;
      }
    }

    // No pop-up on success: the row turns into "accepted" / "declined".
    resolve(notification.id, resolution);
  }

  const inner = (
    <>
      <div className="shrink-0">
        {notification.actorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
          <img
            src={notification.actorAvatar}
            alt=""
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div
            className={`flex size-10 items-center justify-center rounded-full border ${toneSolid[style.tone]}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src={style.icon} alt="" className="h-4 w-auto brightness-0 invert" />
          </div>
        )}
      </div>

      {/* At least as tall as the avatar and centred in it, so a title with no
          subtitle sits level with the picture instead of hugging the top.
          Longer text just grows the column; the avatar stays at the top. */}
      <div className="flex min-h-10 min-w-0 flex-1 flex-col justify-center gap-0.5">
        <div className="flex items-baseline justify-between gap-3">
          {/* The sentence is regular weight and a soft grey; names (the person
              and the lobby) are a step heavier and white, so they stand out. */}
          <span className="min-w-0 text-sm font-normal text-text-subtle">
            {game && (
              // eslint-disable-next-line @next/next/no-img-element -- static SVG logo, no benefit from next/image optimization
              <img
                src={game.icon}
                alt={game.name}
                title={game.name}
                className="mr-1.5 inline-block h-3.5 w-auto align-[-2px]"
              />
            )}
            {titleSegments(notification).map((segment, index) =>
              segment.name ? (
                <span key={index} className="font-medium text-white">
                  {segment.text}
                </span>
              ) : (
                segment.text
              ),
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-text-muted">
            {notification.createdAgo}
            {/* Unread is a small dot after the time. Only unread rows have one,
                so a read row's time sits flush against the right edge. */}
            {!notification.read && (
              <span aria-label="Unread" className="size-1.5 rounded-full bg-brand" />
            )}
          </span>
        </div>
        {notification.body && (
          <span className="text-xs leading-relaxed text-text-muted">
            {notification.body}
          </span>
        )}
        {actionable ? (
          <ActionButtons
            notification={notification}
            onResolve={handleResolve}
            busy={busy}
          />
        ) : notification.resolution ? (
          <span
            className={`mt-2 w-fit rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
              notification.resolution === "accepted"
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }`}
          >
            {notification.resolution}
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <li className="flex items-start gap-3 overflow-hidden rounded-xl border border-border-default bg-bg-page p-4 transition-colors hover:border-border-strong">
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
