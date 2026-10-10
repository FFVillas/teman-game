"use client";

import { useState } from "react";
import { ToastCard } from "@/components/notifications/ToastHost";
import {
  TOAST_MS,
  useNotifications,
  type Toast,
} from "@/contexts/NotificationContext";
import { incomingToast, type NotificationInsert } from "@/lib/notifications";

// TEMPORARY design gallery for the bottom-right pop-ups. Delete src/app/dev
// when the redesign is done.

/** From things you just did. */
const confirmations: { label: string; toast: Toast }[] = [
  {
    label: "Success",
    toast: {
      id: "c1",
      tone: "success",
      title: "Lobby is live",
      body: "It no longer accepts new players.",
    },
  },
  {
    label: "Info",
    toast: {
      id: "c2",
      tone: "info",
      title: "Lobby ended",
      body: "The chat is closed for everyone.",
    },
  },
  {
    label: "Danger",
    toast: {
      id: "c3",
      tone: "danger",
      title: "Message not sent",
      body: "Check your connection and try again.",
    },
  },
  {
    label: "Subtitle clamped to two lines, then an ellipsis",
    toast: {
      id: "c4",
      tone: "danger",
      title: "Couldn't answer this request",
      body: "This player no longer fits the lobby now that others have joined, and the leader has already filled every remaining open slot, so it can't be accepted any more.",
    },
  },
  {
    label: "Has a related page (the whole card is a link)",
    toast: {
      id: "c5",
      tone: "success",
      title: "Profile updated",
      body: "Your changes have been saved.",
      href: "/profile/me",
    },
  },
];

const row = (
  kind: NotificationInsert["kind"],
  title: string,
  body: string | null,
  extra: Partial<NotificationInsert> = {},
): NotificationInsert => ({
  id: `n-${kind}`,
  kind,
  title,
  body,
  href: "/lfg/valorant/lobby/demo",
  actor_id: "actor",
  ref_id: "ref",
  ...extra,
});

/** From things that happened to you: built by the real `incomingToast()`. */
const incoming: { label: string; toast: Toast }[] = (
  [
    ["Lobby invite (Accept / Decline)", row("lobby_invite", "Yonziii invited you to Radiant grind", "Valorant · Competitive")],
    ["Join request (Accept / Decline)", row("join_request", "Tenz wants to join Radiant grind", 'Duelist · Immortal 2: "Hi! I main Jett and play every night."')],
    ["Friend request (Accept / Decline)", row("friend_request", "Tenz sent you a friend request", null, { href: "/social/pending", ref_id: null })],
    ["You were accepted", row("application_accepted", "You're in Radiant grind", "The leader accepted your application.")],
    ["You were declined", row("application_declined", "Sova declined your application to Night owls", null)],
    ["Lobby started", row("lobby_started", "Radiant grind has started", "Head over and join your teammates.")],
    ["You were removed", row("removed_from_lobby", "You were removed from Radiant grind", "The leader removed you from the lobby.")],
  ] as [string, NotificationInsert][]
).map(([label, notification], index) => ({
  label,
  toast: { ...incomingToast(notification), id: `i${index}` },
}));

export default function ToastGallery() {
  const { toast } = useNotifications();
  // Re-mounting the cards restarts their countdown bar and slide-in.
  const [replay, setReplay] = useState(0);

  const button =
    "flex h-9 items-center rounded-lg border border-border-strong px-3.5 text-xs font-semibold text-text-subtle transition-colors hover:border-brand/60 hover:text-white";

  const fire = (sample: Toast) => {
    const { id: _id, ...rest } = sample;
    void _id;
    toast(rest);
  };

  const grid = (items: { label: string; toast: Toast }[]) => (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {items.map(({ label, toast: sample }) => (
        <div key={sample.id} className="flex flex-col gap-1.5">
          <span className="text-[11px] text-text-muted">{label}</span>
          <ToastCard
            key={`${sample.id}-${replay}`}
            toast={sample}
            onDismiss={() => {}}
            onAnswer={sample.action ? () => {} : undefined}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
          Try the real thing (bottom right of the window)
        </h2>
        <div className="flex flex-wrap gap-2">
          {confirmations.slice(0, 3).map(({ label, toast: sample }) => (
            <button key={sample.id} type="button" className={button} onClick={() => fire(sample)}>
              {label}
            </button>
          ))}
          <button
            type="button"
            className={button}
            onClick={() => incoming.slice(3, 7).forEach(({ toast: sample }) => fire(sample))}
          >
            Four at once (stacking)
          </button>
          <button
            type="button"
            className={button}
            onClick={() => fire(incoming[0].toast)}
          >
            Invite with buttons (Accept will show the error pop-up)
          </button>
        </div>
        <p className="text-xs text-text-muted">
          Each one dismisses itself after {TOAST_MS / 1000}s (12s with buttons),
          or on the ×. A pop-up with a related page opens it when you click
          anywhere on the card (not the buttons), and closes.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
            From something you just did
          </h2>
          <button type="button" className={button} onClick={() => setReplay((n) => n + 1)}>
            Replay animation
          </button>
        </div>
        {grid(confirmations)}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
          From something that happened to you (realtime)
        </h2>
        {grid(incoming)}
      </section>
    </div>
  );
}
