"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface LobbyActionsMenuProps {
  /** Omit to hide "Edit details" (lobbies from the database can't be edited yet). */
  editHref?: string;
  /** Leader of a started lobby: back to recruiting, e.g. to replace someone who left. */
  onReopen?: () => void;
  /** Omit to hide the end item (e.g. once the lobby is over). */
  onEnd?: () => void;
  /** "Close lobby" before it starts (a cancellation), "End lobby" after. */
  endLabel?: string;
  /** For a member: leave the lobby. */
  onLeave?: () => void;
}

const itemClass =
  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-bold transition-colors";

export default function LobbyActionsMenu({
  editHref,
  onReopen,
  onEnd,
  endLabel = "End lobby",
  onLeave,
}: LobbyActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Nothing to offer: no menu rather than an empty one.
  if (!editHref && !onReopen && !onEnd && !onLeave) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Lobby settings"
        // Sits on top of cover art, which can be bright or dark. A dark,
        // slightly see-through fill keeps the dots readable on either; the
        // border and shadow separate it from the picture's edge.
        className="flex h-9 items-center justify-center rounded-lg border border-white/20 bg-[rgba(15,23,42,0.8)] px-3 text-white shadow-md shadow-black/50 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-[rgba(15,23,42,0.95)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/lfg-kebab.svg" alt="" className="h-3.5 w-auto" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-20 w-48 overflow-hidden rounded-xl border border-white/10 bg-bg-card-alt py-1 shadow-xl shadow-black/40"
        >
          {editHref && (
            <Link
              href={editHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`${itemClass} text-white hover:bg-white/5`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lfg-edit.svg" alt="" className="size-3" />
              Edit details
            </Link>
          )}

          {onReopen && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onReopen();
              }}
              className={`${itemClass} text-white hover:bg-white/5`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lfg-plus.svg" alt="" className="size-3" />
              Reopen recruiting
            </button>
          )}

          {onEnd && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEnd();
              }}
              className={`${itemClass} text-danger hover:bg-danger/10`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lfg-stop.svg" alt="" className="size-3" />
              {endLabel}
            </button>
          )}

          {onLeave && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLeave();
              }}
              className={`${itemClass} text-danger hover:bg-danger/10`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lfg-stop.svg" alt="" className="size-3" />
              Leave lobby
            </button>
          )}
        </div>
      )}
    </div>
  );
}
