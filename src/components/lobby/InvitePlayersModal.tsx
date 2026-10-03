"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lobby, LobbyMember } from "@/data/lfg-lobby";
import { lfgRoles, type LfgRole } from "@/data/lfg-roles";
import {
  lfgCandidates,
  reputationFilterOptions,
  type LfgCandidate,
} from "@/data/lfg-candidates";
import {
  playstyleLabels,
  rankLabel,
  rankOrdinal,
  scoreMatch,
} from "@/lib/recommendation";
import { readStoredAdminData } from "@/lib/admin-store";
import { activeRestriction } from "@/lib/admin";

const allRoles: LfgRole[] = Object.values(lfgRoles);

type SortKey = "match" | "reputation" | "rank";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "match", label: "Recommended" },
  { value: "reputation", label: "Highest rating" },
  { value: "rank", label: "Closest rank" },
];

interface InvitePlayersModalProps {
  lobby: Lobby;
  members: LobbyMember[];
  invitedIds: string[];
  /** Names of people who already applied — they're handled in Applications. */
  applicantNames: string[];
  openSlots: number;
  onInvite: (candidate: LfgCandidate) => void;
  onClose: () => void;
}

/**
 * Where the recommendation engine shows up for a leader: everyone they could
 * invite, ordered by S_total against this lobby's criteria. The score itself
 * stays behind the scenes — players see a ranked list, not numbers to game.
 *
 * A modal rather than a separate page so the roster stays one click away and
 * the leader never loses the lobby they're filling.
 */
export default function InvitePlayersModal({
  lobby,
  members,
  invitedIds,
  applicantNames,
  openSlots,
  onInvite,
  onClose,
}: InvitePlayersModalProps) {
  const [query, setQuery] = useState("");
  const [roles, setRoles] = useState<string[]>(
    lobby.lookingFor.map((role) => role.name)
  );
  const [minReputation, setMinReputation] = useState(0);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [micOnly, setMicOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("match");

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

  const lobbyOrdinal = rankOrdinal(lobby.rank.name, lobby.rankDivision);
  const invitesLeft = openSlots - invitedIds.length;

  // Hard filters come first, exactly like the spec's pipeline: game (all
  // candidates here are Valorant), not already involved with this lobby, and
  // not suspended or banned. Only then does scoring happen.
  const { eligible, restrictedCount } = useMemo(() => {
    const admin = readStoredAdminData();
    const taken = new Set(
      [...members.map((m) => m.name), ...applicantNames].map((n) =>
        n.toLowerCase()
      )
    );
    const available = lfgCandidates.filter(
      (candidate) => !taken.has(candidate.name.toLowerCase())
    );
    const pool = available.filter(
      (candidate) =>
        !activeRestriction(candidate.name.toLowerCase(), admin.sanctions)
    );
    const restricted = available.length - pool.length;
    return {
      eligible: pool.map((candidate) => ({
        candidate,
        score: scoreMatch(
          {
            playstyle: candidate.playstyle,
            reputation: candidate.reputation,
            tags: candidate.tags,
            rankOrdinal: rankOrdinal(candidate.rank.name, candidate.division),
          },
          {
            playstyle: lobby.playstyle,
            wantedTags: lobby.wantedTags,
            rankOrdinal: lobbyOrdinal,
          }
        ),
      })),
      restrictedCount: restricted,
    };
  }, [members, applicantNames, lobby, lobbyOrdinal]);

  const visible = eligible
    .filter(({ candidate }) => roles.length === 0 || roles.includes(candidate.role.name))
    .filter(({ candidate }) => candidate.reputation >= minReputation)
    .filter(({ candidate }) => !onlineOnly || candidate.isOnline)
    .filter(({ candidate }) => !micOnly || candidate.micOn)
    .filter(({ candidate }) =>
      candidate.name.toLowerCase().includes(query.trim().toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "reputation") return b.candidate.reputation - a.candidate.reputation;
      if (sort === "rank") return a.score.deltaR - b.score.deltaR;
      return b.score.total - a.score.total;
    });

  function toggleRole(name: string) {
    setRoles((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );
  }

  const chip = (active: boolean) =>
    `flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-semibold transition-colors ${
      active
        ? "border-brand/60 bg-brand/10 text-white"
        : "border-border-default text-text-muted hover:border-border-strong hover:text-white"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Invite players"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl border border-border-strong bg-bg-card-alt"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border-subtle p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-lg font-extrabold text-white">
                Invite players
              </h2>
              <p className="text-xs text-text-muted">
                Recommended for {lobby.name}: players who fit your playstyle, tags and rank come first.{" "}
                {invitesLeft > 0
                  ? `${invitesLeft} invite${invitesLeft === 1 ? "" : "s"} left for ${openSlots} open slot${openSlots === 1 ? "" : "s"}.`
                  : "Every open slot has an invite out."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-default transition-colors hover:border-border-strong"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lobby-close.svg" alt="" className="size-3.5" />
            </button>
          </div>

          {/* What the lobby is asking for — what the ranking is measured against. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border-default bg-bg-page px-3.5 py-2.5 text-[11px]">
            <span className="text-text-muted">
              Playstyle{" "}
              <span className="font-bold text-white">
                {playstyleLabels[lobby.playstyle]}
              </span>
            </span>
            <span className="text-text-muted">
              Rank{" "}
              <span className="font-bold text-white">
                {rankLabel(lobby.rank.name, lobby.rankDivision)}
              </span>
            </span>
            <span className="text-text-muted">
              Tags{" "}
              <span className="font-bold text-white">
                {lobby.wantedTags.length > 0 ? lobby.wantedTags.join(", ") : "Any"}
              </span>
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative flex h-8 flex-1 items-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img src="/icons/lfg-search.svg" alt="" className="pointer-events-none absolute left-3 size-3.5" />
                <span className="sr-only">Search players</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search players"
                  className="h-full w-full rounded-lg border border-border-default bg-bg-page pl-8 pr-3 text-xs text-white placeholder:text-text-muted focus:border-brand/60 focus:outline-none"
                />
              </label>
              <div className="flex gap-2">
                {[
                  {
                    label: "Minimum rating",
                    prefix: undefined,
                    value: String(minReputation),
                    onChange: (v: string) => setMinReputation(Number(v)),
                    options: reputationFilterOptions.map((o) => ({ value: String(o.value), label: o.label })),
                  },
                  {
                    label: "Sort by",
                    prefix: "Sort by",
                    value: sort,
                    onChange: (v: string) => setSort(v as SortKey),
                    options: sortOptions,
                  },
                ].map((select) => (
                  <div key={select.label} className="flex flex-1 items-center gap-2 sm:flex-none">
                    {select.prefix && (
                      <span className="whitespace-nowrap text-[11px] text-text-muted">
                        {select.prefix}
                      </span>
                    )}
                    <div className="relative flex-1 sm:w-40 sm:flex-none">
                      <select
                        value={select.value}
                        onChange={(event) => select.onChange(event.target.value)}
                        aria-label={select.label}
                        className="h-8 w-full appearance-none rounded-lg border border-border-default bg-bg-page pl-3 pr-8 text-xs text-white focus:border-brand/60 focus:outline-none"
                      >
                        {select.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                      <img src="/icons/lfg-select-chevron.svg" alt="" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 opacity-50" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {allRoles.map((role) => (
                <button
                  key={role.name}
                  type="button"
                  aria-pressed={roles.includes(role.name)}
                  onClick={() => toggleRole(role.name)}
                  className={chip(roles.includes(role.name))}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img src={role.icon} alt="" className="size-3" />
                  {role.name}
                </button>
              ))}
              <span className="mx-1 h-5 w-px bg-border-default" />
              <button type="button" aria-pressed={onlineOnly} onClick={() => setOnlineOnly((v) => !v)} className={chip(onlineOnly)}>
                Online now
              </button>
              <button type="button" aria-pressed={micOnly} onClick={() => setMicOnly((v) => !v)} className={chip(micOnly)}>
                Mic on
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-5 sm:p-6">
          {visible.length === 0 && (
            <li className="py-10 text-center text-xs text-text-muted">
              Nobody matches these filters. Try fewer roles or a lower rating.
            </li>
          )}
          {visible.map(({ candidate }, index) => {
            const invited = invitedIds.includes(candidate.id);
            return (
              <li
                key={candidate.id}
                className="rounded-xl border border-border-default bg-bg-page/60 p-3.5"
              >
                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <div className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
                    <img src={candidate.avatar} alt="" className="size-10 rounded-full object-cover" />
                    {candidate.isOnline && (
                      <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-bg-card-alt bg-success" />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-white">{candidate.name}</span>
                      {sort === "match" && index === 0 && (
                        <span className="rounded bg-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-success">
                          Top pick
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-text-muted">
                      <span className="flex items-center gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization */}
                        <img src={candidate.rank.icon} alt="" className="size-3" />
                        <span className={`font-bold ${candidate.rank.colorClass}`}>
                          {rankLabel(candidate.rank.name, candidate.division)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                        <img src={candidate.role.icon} alt="" className="size-3" />
                        {candidate.role.name}
                      </span>
                      <span className="text-star">
                        ★ {candidate.reputation.toFixed(1)}
                        <span className="text-text-muted"> ({candidate.reviewCount})</span>
                      </span>
                      <span>{playstyleLabels[candidate.playstyle]}</span>
                      {!candidate.micOn && <span>No mic</span>}
                    </div>
                    {candidate.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {candidate.tags.map((tag) => {
                          const wanted = lobby.wantedTags.includes(tag);
                          return (
                            <span
                              key={tag}
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                wanted
                                  ? "border-brand/40 bg-brand/10 text-brand"
                                  : "border-border-default text-text-muted"
                              }`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="ml-auto flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => onInvite(candidate)}
                      disabled={invited || invitesLeft <= 0}
                      className={`flex h-9 min-w-[84px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-opacity disabled:cursor-not-allowed ${
                        invited
                          ? "border border-success/40 bg-success/10 text-success"
                          : "bg-brand text-white hover:opacity-90 disabled:opacity-40"
                      }`}
                    >
                      {invited ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                          <img src="/icons/action-accept.svg" alt="" className="size-3" />
                          Invited
                        </>
                      ) : (
                        "Invite"
                      )}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="border-t border-border-subtle px-5 py-3 text-[11px] text-text-muted sm:px-6">
          {visible.length} of {eligible.length} players shown.
          {restrictedCount > 0 &&
            ` ${restrictedCount} suspended or banned account${restrictedCount === 1 ? " is" : "s are"} never recommended.`}
        </p>
      </div>
    </div>
  );
}
