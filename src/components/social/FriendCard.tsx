"use client";

import { useEffect, useRef, useState } from "react";
import type { Friend } from "@/data/social-friends";
import PlayerActionsPopup from "./PlayerActionsPopup";

const statusDot: Record<Friend["status"], string> = {
  online: "/icons/status-dot-online.svg",
  idle: "/icons/status-dot-idle.svg",
  offline: "/icons/status-dot-scheduled.svg",
};

const statusLabel: Record<Friend["status"], string> = {
  online: "Online",
  idle: "Idle",
  offline: "Offline",
};

const statusColor: Record<Friend["status"], string> = {
  online: "text-[#10b981]",
  idle: "text-[#f0b429]",
  offline: "text-text-muted",
};

export default function FriendCard({ friend }: { friend: Friend }) {
  const isOffline = friend.status === "offline";
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
        <div className={`relative shrink-0 ${isOffline ? "opacity-60" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
          <img
            src={friend.avatar}
            alt=""
            className="size-9 rounded-full object-cover"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img
            src={statusDot[friend.status]}
            alt=""
            className="absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-bg-card-alt"
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <span
            className={`truncate text-[13px] font-bold ${isOffline ? "text-white/60" : "text-white"}`}
          >
            {friend.name}
          </span>
          <span className={`text-[11px] ${statusColor[friend.status]}`}>
            {statusLabel[friend.status]}
          </span>
        </div>
      </button>

      {open && (
        <PlayerActionsPopup
          isFriend
          target={friend}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
