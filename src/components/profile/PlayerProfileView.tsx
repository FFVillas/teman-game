"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlayerProfile } from "@/data/player-profiles";
import { matchesForSlug } from "@/data/match-history";
import MatchHistoryList from "./MatchHistoryList";
import BackLink from "@/components/BackLink";
import { EmptyState, NotSetOrAdd } from "@/components/EmptyState";
import { profileCompleteness } from "@/lib/profile-completeness";

const gameTabs = [
  "Valorant",
  "League of Legends",
  "Mobile Legends: Bang Bang",
  "Counter-Strike 2",
];

const playstyleLabel = [
  "Very casual",
  "Casual",
  "Balanced",
  "Competitive",
  "Very competitive",
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
  const editHref = "/profile/me/edit";
  const { percent, gaps } = profileCompleteness(profile);
  const hasReviews = profile.reviewCount > 0;

  return (
    <div className="flex flex-col gap-4">
      <BackLink label="Back to lobbies" href="/lfg/valorant" />

      <div className="overflow-hidden rounded-2xl border border-border-strong bg-bg-page">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default bg-bg-card-alt p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="size-16 overflow-hidden rounded-full border-2 border-brand p-0.5 sm:size-20">
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- profile avatar, no benefit from next/image optimization
                  <img
                    src={profile.avatar}
                    alt=""
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center rounded-full bg-brand/15 text-xl font-bold text-brand sm:text-2xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                )}
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
              {hasReviews ? (
                <div className="flex flex-wrap items-center gap-2">
                  <StarRating score={profile.ratingScore} />
                  <span className="text-[11px] text-text-muted">
                    {profile.ratingScore.toFixed(1)} · {profile.reviewCount}{" "}
                    reviews
                  </span>
                </div>
              ) : (
                // A 0.0 with five grey stars reads as a terrible player, not
                // as a new one — so an unrated account says so in words.
                <span className="text-[11px] italic text-text-muted/70">
                  No ratings yet · teammates rate you after a lobby
                </span>
              )}
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
                <Link
                  href={`/messages?user=${encodeURIComponent(profile.slug)}&name=${encodeURIComponent(profile.username)}&avatar=${encodeURIComponent(profile.avatar)}`}
                  className="flex h-10 items-center justify-center rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                >
                  Message
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 p-5 sm:p-6">
          {/*
            Owner-only nudge. A brand-new account is mostly blank, and the
            quickest way to make a profile real is to say exactly what is
            missing and why it matters — rather than leaving the person to
            guess which of the dimmed fields are worth filling in.
          */}
          {isOwner && gaps.length > 0 && (
            <section className="flex flex-col gap-3 rounded-2xl border border-brand/25 bg-brand/[0.05] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-bold text-white">
                    Your profile is {percent}% complete
                  </h2>
                  <p className="text-[11px] text-text-muted">
                    {gaps.length} thing{gaps.length === 1 ? "" : "s"} left.
                    Lobby leaders read this page before they accept you.
                  </p>
                </div>
                <Link
                  href={editHref}
                  className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-brand px-4 text-xs font-bold text-white transition-opacity hover:opacity-90"
                >
                  Complete profile
                </Link>
              </div>

              <div
                className="h-1.5 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completeness"
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width]"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <ul className="flex flex-wrap gap-1.5">
                {gaps.map((gap) => (
                  <li
                    key={gap.key}
                    title={gap.hint}
                    className="rounded-full border border-border-default px-2.5 py-1 text-[10px] font-semibold text-text-muted"
                  >
                    {gap.label}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-bg-card-alt p-5">
              <h2 className={sectionHeading}>Player dossier</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className="flex flex-col gap-1">
                  <span className={fieldLabel}>Age</span>
                  {profile.dossier.age ? (
                    <span className="text-xs text-white">
                      {profile.dossier.age} years
                    </span>
                  ) : (
                    <NotSetOrAdd isOwner={isOwner} href={editHref} />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className={fieldLabel}>Gender</span>
                  {profile.dossier.gender ? (
                    <span className="text-xs text-white">
                      {profile.dossier.gender}
                    </span>
                  ) : (
                    <NotSetOrAdd isOwner={isOwner} href={editHref} />
                  )}
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <span className={fieldLabel}>Playstyle</span>
                  {profile.playstyle ? (
                    <span className="text-xs text-white">
                      {profile.playstyle}/5 ·{" "}
                      {playstyleLabel[profile.playstyle - 1]}
                    </span>
                  ) : (
                    <NotSetOrAdd isOwner={isOwner} href={editHref} />
                  )}
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <span className={fieldLabel}>Personality</span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.personalityTags.length === 0 && (
                      <NotSetOrAdd isOwner={isOwner} href={editHref} />
                    )}
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
                  {profile.dossier.languages ? (
                    <span className="text-xs text-white">
                      {profile.dossier.languages}
                    </span>
                  ) : (
                    <NotSetOrAdd isOwner={isOwner} href={editHref} />
                  )}
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img
                    src="/icons/player-clock.svg"
                    alt=""
                    className="size-3"
                  />
                  {profile.dossier.availability ? (
                    <span className="text-xs text-white">
                      {profile.dossier.availability}
                    </span>
                  ) : (
                    <NotSetOrAdd
                      isOwner={isOwner}
                      href={editHref}
                      action="Add play hours"
                      label="Play hours not set"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-bg-card-alt p-5">
              <h2 className={sectionHeading}>Connections</h2>
              <div className="flex flex-col gap-2">
                {profile.connections.length === 0 && (
                  <EmptyState
                    icon="/icons/social-discord.svg"
                    title="No linked accounts"
                    description={
                      isOwner
                        ? "Linking Discord, Steam or Riot lets teammates reach you outside the app. Coming soon."
                        : `${profile.username} hasn't linked Discord, Steam or Riot.`
                    }
                    size="sm"
                  />
                )}
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
                <EmptyState
                  icon="/icons/lfg-page-valorant.svg"
                  title={`No ${activeGame} profile yet`}
                  description={
                    isOwner
                      ? "Rank, role and win rate sync from the game once that connection is built."
                      : `${profile.username} hasn't added a rank or role for this game.`
                  }
                  size="sm"
                />
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
            <span className={profile.lastMatch === "—" ? "opacity-60" : ""}>
              {profile.lastMatch === "—"
                ? "No matches yet"
                : `Last match: ${profile.lastMatch}`}
            </span>
          </div>
          {profile.region !== "—" && (
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lfg-region.svg" alt="" className="size-2.5" />
              {profile.region} region
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
