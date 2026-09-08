import Link from "next/link";
import type { Friend } from "@/data/social-friends";
import PlayerRowActions from "./PlayerRowActions";
import { profileHrefFor } from "@/data/profile-lookup";

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
  online: "text-success",
  idle: "text-[#f0b429]",
  offline: "text-text-muted",
};

export default function FriendCard({ friend }: { friend: Friend }) {
  const isOffline = friend.status === "offline";

  return (
    <div className="group relative flex w-full items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-white/5">
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

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Full-row link — see PlayerCard for why it's done with ::after. */}
        <Link
          href={profileHrefFor(friend.name)}
          className={`truncate text-[13px] font-bold transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-brand ${isOffline ? "text-white/60" : "text-white"}`}
        >
          {friend.name}
        </Link>
        <span className={`text-[11px] ${statusColor[friend.status]}`}>
          {statusLabel[friend.status]}
        </span>
      </div>

      <PlayerRowActions target={friend} isFriend />
    </div>
  );
}
