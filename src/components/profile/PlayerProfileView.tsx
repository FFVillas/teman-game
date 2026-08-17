"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlayerProfile } from "@/data/player-profiles";
import { matchesForSlug } from "@/data/match-history";
import MatchHistoryList from "./MatchHistoryList";

const gameTabs = [
  "Valorant",
  "League of Legends",
  "Mobile Legends: Bang Bang",
  "Counter-Strike 2",
];

/**
 * Type scale here deliberately matches the lobby and LFG screens — section
 * headings at 11px uppercase, cards at p-5, header actions at h-10/text-xs.
 * Profile used to run ~1.4x larger than the rest of the app and read as a
 * different product.
 */
const sectionHeading =
  "text-[11px] font-bold uppercase tracking-widest text-text-muted";
const fieldLabel =
  "text-[10px] font-bold uppercase tracking-wide text-text-muted";

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
  const activeStat = profile.gameStats.find((stat) => stat.game === activeGame);

  const isOwner = Boolean(profile.isOwner);
  const matches = matchesForSlug(profile.slug);
  const recentMatches = matches.slice(0, 3);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/lfg/valorant"
        className="flex w-fit items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/lfg-back-arrow.svg" alt="" className="size-4" />
        Back to lobbies
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border-strong bg-bg-page">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default bg-bg-card-alt p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="size-16 overflow-hidden rounded-full border-2 border-brand p-0.5 sm:size-20">
                {/* eslint-disable-next-line @next/next/no-img-element -- profile avatar, no benefit from next/image optimization */}
                <img
                  src={profile.avatar}
                  alt=""
                  className="size-full rounded-full object-cover"
                />
              </div>
              {profile.isOnline && (
                <span className="absolute bottom-0 right-0 flex size-4 items-center justify-center rounded-full border-2 border-bg-card-alt bg-bg-card-alt">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img
                    src="/icons/status-dot-online.svg"
                    alt="Online"
                    className="size-2"
                  />
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                {profile.username}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <StarRating score={profile.ratingScore} />
                <span className="text-[11px] text-text-muted">
                  {profile.ratingScore.toFixed(1)} · {profile.reviewCount}{" "}
                  reviews
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isOwner ? (
              <Link
                href="/profile/me/edit"
                className="flex h-10 items-center justify-center rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                Edit profile
              </Link>
            ) : (
              <>
                <Link
                  href={`/profile/${profile.slug}/report`}
                  className="flex h-10 items-center justify-center rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-muted transition-colors hover:border-danger hover:text-danger"
                >
                  Report
                </Link>
                <button
                  type="button"
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-subtle transition-colors hover:text-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img
                    src="/icons/player-add-friend.svg"
                    alt=""
                    className="h-3 w-3.5"
                  />
                  Add friend
                </button>
                <button
                  type="button"
                  className="flex h-10 items-center justify-center rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                >
                  Message
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-bg-card-alt p-5">
              <h2 className={sectionHeading}>Player dossier</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className="flex flex-col gap-1">
                  <span className={fieldLabel}>Age</span>
                  <span className="text-xs text-white">
                    {profile.dossier.age} years
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={fieldLabel}>Gender</span>
                  <span className="text-xs text-white">
                    {profile.dossier.gender}
                  </span>
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <span className={fieldLabel}>Personality</span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.personalityTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-text-subtle"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <span className={fieldLabel}>Languages</span>
                  <span className="text-xs text-white">
                    {profile.dossier.languages}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img
                    src="/icons/player-clock.svg"
                    alt=""
                    className="size-3"
                  />
                  <span className="text-xs text-white">
                    {profile.dossier.availability}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-bg-card-alt p-5">
              <h2 className={sectionHeading}>Connections</h2>
              <div className="flex flex-col gap-2">
                {profile.connections.map((account) => (
                  <div
                    key={account.provider}
                    className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-page px-3 py-2.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                    <img
                      src={account.icon}
                      alt=""
                      className="h-5 w-6 object-contain"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-tight text-text-muted">
                        {account.label}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {account.handle}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-card-alt">
            <div className="flex overflow-x-auto border-b border-border-default px-2">
              {gameTabs.map((game) => (
                <button
                  key={game}
                  type="button"
                  onClick={() => setActiveGame(game)}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
                    activeGame === game
                      ? "border-brand text-white"
                      : "border-transparent text-text-muted hover:text-white"
                  }`}
                >
                  {game}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeStat ? (
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-16 items-center justify-center rounded-full border border-border-default">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization */}
                      <img
                        src={activeStat.rank.icon}
                        alt=""
                        className="size-10"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wide ${activeStat.rank.colorClass}`}
                      >
                        {activeStat.rank.name} {activeStat.tier}
                      </span>
                      <span className="text-[10px] uppercase text-text-muted">
                        {activeStat.lp} LP
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-base font-bold text-white">
                        {profile.username}
                      </h3>
                      <p className="text-[11px] text-text-muted">
                        <span className="font-bold text-white">
                          {profile.region}
                        </span>{" "}
                        ·{" "}
                        <span className="font-bold text-white">
                          {activeStat.wins + activeStat.losses} matches
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-8">
                      <div className="flex flex-col gap-0.5">
                        <span className={fieldLabel}>Win rate</span>
                        <span className="text-xl font-bold text-brand">
                          {(
                            (activeStat.wins /
                              (activeStat.wins + activeStat.losses)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {activeStat.wins}W · {activeStat.losses}L
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className={fieldLabel}>Main role</span>
                        <div className="flex size-9 items-center justify-center rounded-lg border border-border-strong bg-bg-page">
                          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                          <img
                            src={activeStat.mainRole.icon}
                            alt={activeStat.mainRole.name}
                            className="size-3.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-muted">
                  {profile.username} hasn&apos;t linked a profile for{" "}
                  {activeGame} yet.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className={sectionHeading}>Recent match history</h2>
              {matches.length > 0 && (
                <Link
                  href={`/profile/${profile.slug}/matches`}
                  className="text-[10px] font-bold uppercase tracking-wide text-brand hover:underline"
                >
                  View all matches
                </Link>
              )}
            </div>
            <MatchHistoryList
              matches={recentMatches}
              slug={profile.slug}
              isOwner={isOwner}
              compact
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default bg-bg-card-alt px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5 text-[11px] italic text-text-muted">
            <span>Member since {profile.memberSince}</span>
            <span className="size-1 rounded-full bg-border-strong" />
            <span>Last match: {profile.lastMatch}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src="/icons/lfg-region.svg" alt="" className="size-2.5" />
            {profile.region} region
          </div>
        </div>
      </div>
    </div>
  );
}
