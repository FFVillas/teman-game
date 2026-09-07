"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useNotifications } from "@/contexts/NotificationContext";
import { findProfileByUsername } from "@/data/player-profiles";
import type { MessageParticipant } from "@/data/lfg-messages";

interface PlayerRowActionsProps {
  target: MessageParticipant;
  /** Already friends — offer "Invite to party" instead of "Add friend". */
  isFriend?: boolean;
}

const iconButton =
  "flex size-7 shrink-0 items-center justify-center rounded-lg border border-border-default text-text-muted transition-colors hover:border-border-strong hover:text-white";

/**
 * Message and add-friend sit inline as icon buttons: they're the frequent,
 * safe, reversible actions, so costing a click to open a menu first is pure
 * friction. Report stays behind the overflow menu — it's rare and it accuses
 * someone, so it should take deliberate effort and never be a mis-tap next
 * to "Message".
 */
export default function PlayerRowActions({
  target,
  isFriend = false,
}: PlayerRowActionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { toast } = useNotifications();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const profile = findProfileByUsername(target.name);
  const messageHref = `/messages?user=${encodeURIComponent(target.id)}&name=${encodeURIComponent(target.name)}&avatar=${encodeURIComponent(target.avatar)}`;

  function handleRelationAction() {
    // TODO: POST to `friendships` (request) or the party-invite endpoint.
    toast({
      tone: "success",
      title: isFriend ? "Invite sent" : "Friend request sent",
      body: `${target.name} has been notified.`,
    });
  }

  return (
    <div className="relative flex shrink-0 items-center gap-1" ref={rootRef}>
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

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${target.name}`}
        className={iconButton}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-20 w-[170px] overflow-hidden rounded-xl border border-white/10 bg-bg-card-alt py-1 shadow-xl shadow-black/40"
        >
          {profile ? (
            <Link
              href={`/profile/${profile.slug}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center px-3.5 py-2 text-left text-xs text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              View profile
            </Link>
          ) : null}

          {profile ? (
            <Link
              href={`/profile/${profile.slug}/report`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center px-3.5 py-2 text-left text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
            >
              Report player
            </Link>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center px-3.5 py-2 text-left text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
            >
              Report player
            </button>
          )}
        </div>
      )}
    </div>
  );
}
