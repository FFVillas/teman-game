"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import { blockUser, sendFriendRequest } from "@/lib/social";
import type { MessageParticipant } from "@/data/lfg-messages";

interface PlayerRowActionsProps {
  target: MessageParticipant;
  /** Already friends — offer "Invite to party" instead of "Add friend". */
  isFriend?: boolean;
  /**
   * `target.id` is a real profile id, so "Add friend" sends an actual
   * request instead of just showing a toast, and a Block button appears.
   * Set by callers that read from real data (Discover, Friends) — Recent
   * Teammates still passes mock ids, so it leaves this off.
   */
  real?: boolean;
  /** Called after a successful block, so the caller can drop this row. */
  onBlocked?: () => void;
}

const iconButton =
  "flex size-7 shrink-0 items-center justify-center rounded-lg border border-border-default text-text-muted transition-colors hover:border-border-strong hover:text-white disabled:pointer-events-none disabled:opacity-40";

/**
 * Message and add-friend only. Report used to sit in an overflow menu here,
 * but the row itself now opens the player's profile, and that page already
 * carries Report — so the menu existed to hold a single item that had a
 * better home one click away.
 *
 * `relative z-10` keeps these clickable above the row's full-card link.
 */
export default function PlayerRowActions({
  target,
  isFriend = false,
  real = false,
  onBlocked,
}: PlayerRowActionsProps) {
  const { toast, notifyPlayer } = useNotifications();
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const messageHref = `/messages?user=${encodeURIComponent(target.id)}&name=${encodeURIComponent(target.name)}&avatar=${encodeURIComponent(target.avatar)}`;

  async function handleRelationAction(event: React.MouseEvent) {
    // Stop the row link underneath from also firing.
    event.preventDefault();
    event.stopPropagation();

    if (isFriend) {
      // Party invites need an active lobby, which this row doesn't have —
      // no real target to send to yet.
      toast({
        tone: "success",
        title: "Invite sent",
        body: `${target.name} has been notified.`,
      });
      return;
    }

    if (!real || !user) {
      // Mock row (e.g. Recent Teammates) — nothing real to send to.
      toast({
        tone: "success",
        title: "Friend request sent",
        body: `${target.name} has been notified.`,
      });
      return;
    }

    setSending(true);
    const ok = await sendFriendRequest(createClient(), user.id, target.id);
    setSending(false);

    if (!ok) {
      toast({
        tone: "danger",
        title: "Couldn't send that request",
        body: "You may already be connected with this player.",
      });
      return;
    }

    // No pop-up: the button flips to its "sent" state.
    setSent(true);
    notifyPlayer(target.id, {
      kind: "friend_request",
      title: `${user.name} sent you a friend request`,
      href: "/social/pending",
    });
  }

  async function handleBlock(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!user) return;

    setBlocking(true);
    const ok = await blockUser(createClient(), user.id, target.id);
    setBlocking(false);

    if (!ok) {
      toast({
        tone: "danger",
        title: "Couldn't block that player",
        body: "Try again in a moment.",
      });
      return;
    }
    // No pop-up: the row disappears from the list.
    onBlocked?.();
  }

  return (
    <div className="relative z-10 flex shrink-0 items-center gap-1">
      <Link
        href={messageHref}
        aria-label={`Message ${target.name}`}
        title="Message"
        className={iconButton}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2 3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5V9.5C14 10.3284 13.3284 11 12.5 11H5.5L2 14V3.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      <button
        type="button"
        onClick={handleRelationAction}
        disabled={sending || sent}
        aria-label={
          isFriend
            ? `Invite ${target.name} to party`
            : sent
              ? `Friend request sent to ${target.name}`
              : `Add ${target.name} as friend`
        }
        title={
          isFriend ? "Invite to party" : sent ? "Request sent" : "Add friend"
        }
        className={iconButton}
      >
        {isFriend ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M8 5.5V10.5M5.5 8H10.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        ) : sent ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8.5L6.5 12L13 4"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="5.5" r="2.75" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M1.5 15C1.5 12 3.75 9.75 6.5 9.75C9.25 9.75 11.5 12 11.5 15"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M13.25 5V9M11.25 7H15.25"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {real && (
        <button
          type="button"
          onClick={handleBlock}
          disabled={blocking}
          aria-label={`Block ${target.name}`}
          title="Block"
          className={iconButton}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M3.75 3.75L12.25 12.25"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
