"use client";

import Link from "next/link";
import type { LobbyMember } from "@/data/lfg-lobby";
import { findProfileByUsername } from "@/data/player-profiles";

interface LobbyMembersProps {
  members: LobbyMember[];
  slotsTotal: number;
  currentUserId: string;
  /** Leaders can remove members; members just see the roster. */
  canManage: boolean;
  onRemove?: (memberId: string) => void;
}

export default function LobbyMembers({
  members,
  slotsTotal,
  currentUserId,
  canManage,
  onRemove,
}: LobbyMembersProps) {
  const emptySlots = Math.max(slotsTotal - members.length, 0);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border-strong bg-bg-card-alt p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
          Members
        </h2>
        <span className="text-xs font-bold text-white">
          {members.length}/{slotsTotal}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {members.map((member) => {
          const isMe = member.id === currentUserId;
          const profileHref = isMe
            ? "/profile/me"
            : `/profile/${findProfileByUsername(member.name)?.slug ?? ""}`;
          const canLink = isMe || Boolean(findProfileByUsername(member.name));

          return (
          <li
            key={member.id}
            className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-page p-3"
          >
            {canLink ? (
              <Link href={profileHref} className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
                <img
                  src={member.avatar}
                  alt=""
                  className={`size-10 rounded-full object-cover transition-opacity hover:opacity-80 ${
                    member.isLeader ? "border-2 border-brand" : ""
                  }`}
                />
              </Link>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
              <img
                src={member.avatar}
                alt=""
                className={`size-10 shrink-0 rounded-full object-cover ${
                  member.isLeader ? "border-2 border-brand" : ""
                }`}
              />
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                {canLink ? (
                  <Link
                    href={profileHref}
                    className="truncate text-sm font-bold text-white hover:text-brand hover:underline"
                  >
                    {member.name}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-bold text-white">
                    {member.name}
                  </span>
                )}
                {member.id === currentUserId && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/70">
                    You
                  </span>
                )}
                {member.isLeader && (
                  <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">
                    Leader
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-text-muted">
                <span className="flex items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization */}
                  <img src={member.rank.icon} alt="" className="size-3" />
                  <span className={`font-bold ${member.rank.colorClass}`}>
                    {member.rank.name}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img src={member.role.icon} alt="" className="size-3" />
                  {member.role.name}
                </span>
                <span className="flex items-center gap-1 text-star">
                  ★ {member.reputation.toFixed(1)}
                </span>
              </div>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img
              src={member.micOn ? "/icons/lfg-mic.svg" : "/icons/lfg-mic-outline.svg"}
              alt={member.micOn ? "Mic on" : "Mic off"}
              className={`h-3.5 w-2.5 shrink-0 ${member.micOn ? "" : "opacity-40"}`}
            />

            {canManage && !member.isLeader && (
              <button
                type="button"
                onClick={() => onRemove?.(member.id)}
                className="shrink-0 rounded-md border border-border-strong px-2.5 py-1 text-[11px] font-semibold text-text-muted transition-colors hover:border-danger hover:text-danger"
              >
                Remove
              </button>
            )}
          </li>
          );
        })}

        {Array.from({ length: emptySlots }).map((_, index) => (
          <li
            key={index}
            className="flex items-center gap-3 rounded-xl border border-dashed border-border-default p-3"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lfg-avatar-more.svg" alt="" className="size-3" />
            </div>
            <span className="text-xs text-text-muted">Open slot</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
