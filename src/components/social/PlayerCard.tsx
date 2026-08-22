"use client";

import { useEffect, useRef, useState } from "react";
import PlayerActionsPopup from "./PlayerActionsPopup";

interface PlayerCardProps {
  id: string;
  avatar: string;
  name: string;
  context: string;
}

export default function PlayerCard({ id, avatar, name, context }: PlayerCardProps) {
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
        className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-colors hover:bg-white/5"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
        <img
          src={avatar}
          alt=""
          className="size-9 shrink-0 rounded-full object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-bold text-white">{name}</span>
          <span className="truncate text-[11px] text-text-muted">{context}</span>
        </div>
      </button>

      {open && (
        <PlayerActionsPopup
          target={{ id, name, avatar }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
