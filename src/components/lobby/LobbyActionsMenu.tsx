"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface LobbyActionsMenuProps {
  editHref: string;
  /** Omit to hide the "End lobby" item (e.g. once the lobby is completed). */
  onEnd?: () => void;
}

export default function LobbyActionsMenu({
  editHref,
  onEnd,
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

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Lobby settings"
        className="flex h-9 items-center justify-center rounded-lg border border-border-strong px-3 text-text-subtle transition-colors hover:border-white/30 hover:text-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/lfg-kebab.svg" alt="" className="h-3.5 w-auto" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-bg-card-alt py-1 shadow-xl shadow-black/40"
        >
          <Link
            href={editHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-white transition-colors hover:bg-white/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src="/icons/lfg-edit.svg" alt="" className="size-3" />
            Edit details
          </Link>

          {onEnd && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEnd();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-danger transition-colors hover:bg-danger/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lfg-stop.svg" alt="" className="size-3" />
              End lobby
            </button>
          )}
        </div>
      )}
    </div>
  );
}
