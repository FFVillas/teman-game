"use client";

import Link from "next/link";
import { useNotifications } from "@/contexts/NotificationContext";
import type { MessageParticipant } from "@/data/lfg-messages";

interface PlayerRowActionsProps {
  target: MessageParticipant;
  /** Already friends — offer "Invite to party" instead of "Add friend". */
  isFriend?: boolean;
}

const iconButton =
  "flex size-7 shrink-0 items-center justify-center rounded-lg border border-border-default text-text-muted transition-colors hover:border-border-strong hover:text-white";

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
}: PlayerRowActionsProps) {
  const { toast } = useNotifications();

  const messageHref = `/messages?user=${encodeURIComponent(target.id)}&name=${encodeURIComponent(target.name)}&avatar=${encodeURIComponent(target.avatar)}`;

  function handleRelationAction(event: React.MouseEvent) {
    // Stop the row link underneath from also firing.
    event.preventDefault();
    event.stopPropagation();
    // TODO: POST to `friendships` (request) or the party-invite endpoint.
    toast({
      tone: "success",
      title: isFriend ? "Invite sent" : "Friend request sent",
      body: `${target.name} has been notified.`,
    });
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
        aria-label={
          isFriend ? `Invite ${target.name} to party` : `Add ${target.name} as friend`
        }
        title={isFriend ? "Invite to party" : "Add friend"}
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
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization
          <img src="/icons/social-add-friend.svg" alt="" className="size-3.5" />
        )}
      </button>
    </div>
  );
}
