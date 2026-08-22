"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LfgTeam } from "@/data/lfg-teams";
import { lfgRoles, type LfgRole } from "@/data/lfg-roles";
import { findProfileByUsername } from "@/data/player-profiles";
import { modeStyles } from "./LfgTeamCard";

const allRoles: LfgRole[] = Object.values(lfgRoles);

interface RequestToJoinModalProps {
  team: LfgTeam;
  onClose: () => void;
}

export default function RequestToJoinModal({
  team,
  onClose,
}: RequestToJoinModalProps) {
  const [selectedRole, setSelectedRole] = useState<LfgRole>(
    team.lookingFor[0] ?? allRoles[0]
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const mode = modeStyles[team.mode];
  const leaderAvatar = team.members[0]?.avatar;
  const emptySlots = Math.max(team.slotsTotal - team.members.length, 0);
  const leaderProfile = findProfileByUsername(team.leaderName);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // TODO: wire up to the join-request API once it exists.
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Request to join ${team.name}`}
        className="max-h-[95vh] w-full max-w-[750px] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="mb-3 flex items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/lfg-back-arrow.svg" alt="" className="size-3.5" />
          Back to lobbies
        </button>

        <div className="rounded-2xl border-2 border-white/15 bg-bg-card-alt p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-lg font-extrabold text-white sm:text-xl">
                  Request To Join
                </h1>
                <p className="text-[11px] text-text-muted sm:text-xs">
                  Introduce yourself to the team leader and select your
                  preferred role for this session.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <section className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-bg-card-alt p-4">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                    Objectives &amp; Vibes
                  </h2>
                  <p className="text-xs text-white">
                    {team.bio ??
                      `${team.name} is looking for dedicated teammates to climb the ranks together. Come ready to communicate and have fun.`}
                  </p>
                </section>

                <section className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-bg-card-alt p-4">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                    Select Your Role
                  </h2>
                  <div className="grid grid-cols-4 gap-2">
                    {allRoles.map((role) => {
                      const isSelected = role.name === selectedRole.name;
                      return (
                        <button
                          key={role.name}
                          type="button"
                          onClick={() => setSelectedRole(role)}
                          aria-pressed={isSelected}
                          className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2.5 transition-colors ${
                            isSelected
                              ? "border-brand bg-brand/10 text-white"
                              : "border-white/10 bg-bg-page text-text-muted opacity-60 hover:opacity-100"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                          <img src={role.icon} alt="" className="size-4" />
                          <span className="text-[11px] font-bold">
                            {role.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-bg-card-alt p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                      Message to the leader
                    </h2>
                    <span className="text-[10px] italic text-text-muted/50">
                      Optional
                    </span>
                  </div>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={`Hi! I'm an experienced ${selectedRole.name} looking for a competitive team...`}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-white/10 bg-bg-page p-3 text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </section>

                <button
                  type="submit"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img
                    src="/icons/lfg-search-btn.svg"
                    alt=""
                    className="size-3.5"
                  />
                  Apply To Join
                </button>
              </form>
            </div>

            <aside className="flex w-full flex-col gap-3 lg:w-[260px]">
              <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-bg-card-alt">
                <div className="relative min-h-[140px] w-full flex-1">
                  <Image
                    src={team.cover}
                    alt={team.name}
                    fill
                    sizes="260px"
                    className="object-cover object-top opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-card-alt to-transparent" />
                  <span
                    className={`absolute left-3 top-3 inline-flex w-fit items-center rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-wide ${mode.className}`}
                  >
                    {mode.label}
                  </span>
                </div>

                <div className="flex flex-col gap-3 p-4">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-base font-bold text-white">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                      <img
                        src="/icons/lfg-region.svg"
                        alt=""
                        className="size-3"
                      />
                      {team.region}
                      {team.languages && <> • {team.languages}</>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-[9px] font-bold uppercase tracking-wide text-text-muted">
                      Lobby Leader
                    </h4>
                    <div className="flex items-center gap-2">
                      {leaderAvatar &&
                        (leaderProfile ? (
                          <Link href={`/profile/${leaderProfile.slug}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
                            <img
                              src={leaderAvatar}
                              alt=""
                              className="size-8 rounded-full border border-brand object-cover transition-opacity hover:opacity-80"
                            />
                          </Link>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
                          <img
                            src={leaderAvatar}
                            alt=""
                            className="size-8 rounded-full border border-brand object-cover"
                          />
                        ))}
                      <div className="flex flex-col">
                        {leaderProfile ? (
                          <Link
                            href={`/profile/${leaderProfile.slug}`}
                            className="text-xs font-bold text-white hover:text-brand hover:underline"
                          >
                            {team.leaderName}
                          </Link>
                        ) : (
                          <span className="text-xs font-bold text-white">
                            {team.leaderName}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization */}
                          <img
                            src={team.rank.icon}
                            alt=""
                            className="size-3"
                          />
                          <span
                            className={`text-[9px] font-bold ${team.rank.colorClass}`}
                          >
                            {team.rank.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[9px] font-bold uppercase tracking-wide text-text-muted">
                        Current Members
                      </h4>
                      <span className="text-[11px] font-bold text-white">
                        {team.slotsFilled}/{team.slotsTotal}
                      </span>
                    </div>
                    <div className="flex items-center">
                      {team.members.map((member) => (
                        // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
                        <img
                          key={member.id}
                          src={member.avatar}
                          alt=""
                          className="-ml-2 size-7 rounded-full border-2 border-bg-card-alt object-cover first:ml-0"
                        />
                      ))}
                      {Array.from({ length: emptySlots }).map((_, index) => (
                        <div
                          key={index}
                          className="-ml-2 flex size-7 items-center justify-center rounded-full border-2 border-bg-card-alt bg-[#272c33]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                          <img
                            src="/icons/lfg-avatar-more.svg"
                            alt=""
                            className="size-2.5"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                    <h4 className="text-[9px] font-bold uppercase tracking-wide text-text-muted">
                      Lobby Requirements
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {team.micRequired && (
                        <span className="flex items-center gap-1 rounded-full bg-[#10b981]/10 px-2 py-0.5 text-[9px] font-semibold text-[#10b981]">
                          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                          <img
                            src="/icons/lfg-mic.svg"
                            alt=""
                            className="h-2 w-1.5"
                          />
                          Mic Required
                        </span>
                      )}
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[9px] font-semibold text-brand">
                        {team.rank.name}+ Only
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-[10px] leading-[15px] text-text-muted">
                Lobby leaders usually respond within 5-10 minutes. You will
                receive a notification if your request is accepted.
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
