"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import { blockUser, removeFriendship, sendFriendRequest } from "@/lib/social";
import { fetchMyInvitingLobby, fetchMyPendingInvitees, inviteToLobby } from "@/lib/lobbies";
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
  /** Friends only: the friendship, so the row can offer "Remove friend". */
  friendshipId?: string;
  /** Called after the friendship was removed. */
  onRemoved?: () => void;
}

/**
 * Who already has an invite to my lobby, asked once per page however many
 * rows there are, and forgotten after a new invite so the next page asks again.
 */
let pendingInvitees: { userId: string; ids: Promise<Set<string>> } | null = null;
function myPendingInvitees(userId: string): Promise<Set<string>> {
  if (pendingInvitees?.userId !== userId) {
    pendingInvitees = { userId, ids: fetchMyPendingInvitees(createClient(), userId) };
  }
  return pendingInvitees.ids;
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
  friendshipId,
  onRemoved,
}: PlayerRowActionsProps) {
  const { toast, notifyPlayer } = useNotifications();
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  // A friend I've already invited shows "Invited", locked, here as in the
  // lobby's own picker, even after a reload.
  useEffect(() => {
    if (!isFriend || !real || !user) return;
    let cancelled = false;
    myPendingInvitees(user.id).then((ids) => {
      if (!cancelled && ids.has(target.id)) setSent(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isFriend, real, user, target.id]);

  // Two clicks, so a stray one doesn't end a friendship.
  async function handleRemove(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!friendshipId) return;
    if (!confirmRemove) {
      setConfirmRemove(true);
      setTimeout(() => setConfirmRemove(false), 4000);
      return;
    }
    setRemoving(true);
    const ok = await removeFriendship(createClient(), friendshipId);
    setRemoving(false);
    setConfirmRemove(false);
    if (!ok) {
      toast({ tone: "danger", title: "Couldn't remove them", body: "Try again in a moment." });
      return;
    }
    onRemoved?.();
  }

  const messageHref = `/messages?user=${encodeURIComponent(target.id)}&name=${encodeURIComponent(target.name)}&avatar=${encodeURIComponent(target.avatar)}`;

  async function handleRelationAction(event: React.MouseEvent) {
    // Stop the row link underneath from also firing.
    event.preventDefault();
    event.stopPropagation();

    if (isFriend) {
      if (!real || !user) {
        // Mock row: nobody real to invite.
        toast({
          tone: "success",
          title: "Invite sent",
          body: `${target.name} has been notified.`,
        });
        return;
      }
      // A real invitation into the lobby this player leads (the same one the
      // lobby page's "Invite players" sends), so it reaches the friend's bell
      // and, with push on, their phone.
      setSending(true);
      const supabase = createClient();
      const lobby = await fetchMyInvitingLobby(supabase, user.id);
      if (!lobby) {
        setSending(false);
        toast({
          tone: "info",
          title: "Create a lobby first",
          body: "You can invite friends to a lobby you lead that is still looking for players.",
        });
        return;
      }
      const error = await inviteToLobby(supabase, lobby.id, target.id);
      setSending(false);
      if (error) {
        toast({ tone: "danger", title: "Couldn't invite them", body: error });
        return;
      }
      setSent(true);
      pendingInvitees = null;
      // The row doesn't show where they were invited, so say it.
      toast({
        tone: "success",
        title: `Invited ${target.name}`,
        body: `To ${lobby.name}. They can accept from their notifications.`,
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
            ? sent
              ? `${target.name} is invited to your lobby`
              : `Invite ${target.name} to your lobby`
            : sent
              ? `Friend request sent to ${target.name}`
              : `Add ${target.name} as friend`
        }
        title={
          isFriend
            ? sent
              ? "Invited"
              : "Invite to your lobby"
            : sent
              ? "Request sent"
              : "Add friend"
        }
        className={iconButton}
      >
        {isFriend && !sent ? (
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

      {isFriend && real && friendshipId && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          aria-label={confirmRemove ? `Confirm removing ${target.name}` : `Remove ${target.name} from friends`}
          title={confirmRemove ? "Click again to remove" : "Remove friend"}
          className={
            confirmRemove
              ? "flex h-7 shrink-0 items-center justify-center rounded-lg border border-danger bg-danger/10 px-2 text-[11px] font-bold text-danger"
              : iconButton
          }
        >
          {confirmRemove ? (
            "Remove?"
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="5.5" r="2.75" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1.5 15C1.5 12 3.75 9.75 6.5 9.75C9.25 9.75 11.5 12 11.5 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M11.25 7H15.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          )}
        </button>
      )}

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
