"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlayerProfile } from "@/data/player-profiles";

const gameTabs = [
  "Valorant",
  "League of Legends",
  "Mobile Legends: Bang Bang",
  "Counter-Strike 2",
];

function StarRating({ score }: { score: number }) {
  const fullStars = Math.floor(score);
  const hasHalfStar = score - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => {
        const isFull = index < fullStars;
        const isHalf = !isFull && index === fullStars && hasHalfStar;
        return (
          // eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization
          <img
            key={index}
            src={
              isFull
                ? "/icons/player-star-full.svg"
                : isHalf
                  ? "/icons/player-star-half.svg"
                  : "/icons/player-star-full.svg"
            }
            alt=""
            className={`h-3 w-3.5 ${isFull || isHalf ? "" : "opacity-20"}`}
          />
        );
      })}
    </div>
  );
}

export default function PlayerProfileView({
  profile,
}: {
  profile: PlayerProfile;
}) {
  const [activeGame, setActiveGame] = useState(gameTabs[0]);
  const activeStat = profile.gameStats.find(
    (stat) => stat.game === activeGame
  );

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/lfg/valorant"
        className="flex w-fit items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/lfg-back-arrow.svg" alt="" className="size-4" />
        Back to lobbies
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-page">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-[#2d2f36] bg-bg-card-alt p-6 sm:p-10">
          <div className="flex items-center gap-6 sm:gap-8">
            <div className="relative shrink-0">
              <div className="size-24 overflow-hidden rounded-full border-[3px] border-brand p-1 sm:size-32">
                {/* eslint-disable-next-line @next/next/no-img-element -- profile avatar, no benefit from next/image optimization */}
                <img
                  src={profile.avatar}
                  alt=""
                  className="size-full rounded-full object-cover"
                />
              </div>
              {profile.isOnline && (
                <span className="absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-full border-4 border-bg-card-alt bg-bg-card-alt">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img
                    src="/icons/status-dot-online.svg"
                    alt="Online"
                    className="size-3"
                  />
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {profile.username}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <StarRating score={profile.ratingScore} />
                <span className="text-sm text-text-muted">
                  ({profile.reviewCount} reviews)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile.isOwner ? (
              <button
                type="button"
                className="flex h-11 items-center justify-center rounded-xl bg-brand px-8 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="flex h-11 items-center justify-center rounded-xl bg-[#2d2f36] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Report
                </button>
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2d2f36] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img
                    src="/icons/player-add-friend.svg"
                    alt=""
                    className="h-3.5 w-[17.5px]"
                  />
                  Add Friend
                </button>
                <button
                  type="button"
                  className="flex h-11 items-center justify-center rounded-xl bg-brand px-8 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  Message
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-10 p-6 sm:p-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6 rounded-2xl border border-border-default bg-bg-card-alt p-6">
              <h2 className="text-xs font-black uppercase tracking-[2px] text-text-muted">
                Player Dossier
              </h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    Age
                  </span>
                  <span className="text-base text-white">
                    {profile.dossier.age} Years
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    Gender
                  </span>
                  <span className="text-base text-white">
                    {profile.dossier.gender}
                  </span>
                </div>
                <div className="col-span-2 flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    Personality
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.personalityTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    Languages
                  </span>
                  <span className="text-base text-white">
                    {profile.dossier.languages}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img
                    src="/icons/player-clock.svg"
                    alt=""
                    className="size-3.5"
                  />
                  <span className="text-sm text-white">
                    {profile.dossier.availability}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-bg-card-alt p-6">
              <h2 className="text-xs font-black uppercase tracking-[2px] text-text-muted">
                Connections
              </h2>
              <div className="flex flex-col gap-3">
                {profile.connections.map((account) => (
                  <div
                    key={account.provider}
                    className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-page/30 px-5 py-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                    <img
                      src={account.icon}
                      alt=""
                      className="h-6 w-7 object-contain"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-tight text-text-muted">
                        {account.label}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {account.handle}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8 overflow-hidden rounded-2xl border border-border-default bg-bg-card-alt">
            <div className="flex overflow-x-auto border-b border-border-default px-4">
              {gameTabs.map((game) => (
                <button
                  key={game}
                  type="button"
                  onClick={() => setActiveGame(game)}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-6 py-4 text-sm font-bold transition-colors ${
                    activeGame === game
                      ? "border-brand text-white"
                      : "border-transparent text-text-muted hover:text-white"
                  }`}
                >
                  {game}
                </button>
              ))}
            </div>

            <div className="px-6 pb-8 sm:px-8">
              {activeStat ? (
                <div className="flex flex-wrap items-center gap-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex size-24 items-center justify-center rounded-full border border-border-default">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization */}
                      <img
                        src={activeStat.rank.icon}
                        alt=""
                        className="size-16"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={`text-xs font-black uppercase tracking-wide ${activeStat.rank.colorClass}`}
                      >
                        {activeStat.rank.name} {activeStat.tier}
                      </span>
                      <span className="text-[10px] uppercase text-text-muted">
                        {activeStat.lp} LP
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {profile.username}
                      </h3>
                      <p className="text-sm text-text-muted">
                        <span className="font-bold text-white">
                          {profile.region}
                        </span>{" "}
                        •{" "}
                        <span className="font-bold text-white">
                          {activeStat.wins + activeStat.losses} Matches
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-10">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-wide text-text-muted">
                          Win Rate
                        </span>
                        <span className="text-2xl font-black text-brand">
                          {(
                            (activeStat.wins /
                              (activeStat.wins + activeStat.losses)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {activeStat.wins}W - {activeStat.losses}L
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wide text-text-muted">
                          Main Role
                        </span>
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border-strong bg-bg-page">
                          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                          <img
                            src={activeStat.mainRole.icon}
                            alt={activeStat.mainRole.name}
                            className="size-4"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-6 text-sm text-text-muted">
                  {profile.username} hasn&apos;t linked a profile for{" "}
                  {activeGame} yet.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[2px] text-text-muted">
                Recent Team History
              </h2>
              <Link
                href="#"
                className="text-[10px] font-bold uppercase text-brand hover:underline"
              >
                View All Matches
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {profile.recentTeams.map((team) => (
                <div
                  key={team.teamName + team.timeAgo}
                  className="flex items-center justify-between rounded-2xl border border-border-default bg-bg-page p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-white">
                        {team.teamName}
                      </span>
                      <span className="text-xs text-text-muted">
                        {team.lobbyType}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center">
                      {team.memberAvatars.slice(0, 2).map((avatar, index) => (
                        // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
                        <img
                          key={index}
                          src={avatar}
                          alt=""
                          className="-ml-2 size-8 rounded-full border-2 border-bg-page object-cover first:ml-0"
                        />
                      ))}
                      {team.extraMembers > 0 && (
                        <div className="-ml-2 flex size-8 items-center justify-center rounded-full border-2 border-bg-page bg-white/10 text-[10px] font-bold text-white">
                          +{team.extraMembers}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white">
                      {team.timeAgo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2d2f36] bg-bg-card-alt px-6 py-5 sm:px-10">
          <div className="flex items-center gap-3 text-[11px] italic text-[#6b7280]">
            <span>Member since {profile.memberSince}</span>
            <span className="size-1 rounded-full bg-[#2d2f36]" />
            <span>Last match: {profile.lastMatch}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#6b7280]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src="/icons/lfg-region.svg" alt="" className="size-2.5" />
            {profile.region} Region
          </div>
        </div>
      </div>
    </div>
  );
}
