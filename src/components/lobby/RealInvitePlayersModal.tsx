"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PlayerAvatar from "@/components/lfg/PlayerAvatar";
import { reputationFilterOptions } from "@/data/lfg-candidates";
import type { LfgTeam } from "@/data/lfg-teams";
import { roleIconFor } from "@/data/role-icons";
import {
  fetchInviteCandidates,
  rankCandidates,
  type InviteCandidate,
} from "@/lib/invite-candidates";
import type { GameInfo } from "@/lib/games";
import { inviteToLobby } from "@/lib/lobbies";
import { playstyleLabels } from "@/lib/recommendation";
import {
  OPEN_BOUNDS,
  boundsFromTierRange,
  lobbyJoinBounds,
  partyRuleFor,
  tiersOf,
} from "@/lib/ranks";
import { createClient } from "@/lib/supabase/client";

type SortKey = "match" | "reputation" | "rank";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "match", label: "Recommended" },
  { value: "reputation", label: "Highest rating" },
  { value: "rank", label: "Closest rank" },
];

interface RealInvitePlayersModalProps {
  team: LfgTeam;
  game: GameInfo;
  /** Everyone already involved: the roster, applicants, and people already invited. */
  excludeIds: string[];
  /** Open slots with no invitation out yet. */
  invitesLeft: number;
  /** Called after an invitation went out, so the page can show it. */
  onInvited: (username: string) => void;
  onClose: () => void;
}

/**
 * The recommendation engine for a real lobby: the game's players, filtered to
 * those the lobby would accept, ordered by S_total. As in the mock picker the
 * score stays behind the scenes — only the order is shown. Online and mic
 * filters are left out because nothing records either yet.
 */
export default function RealInvitePlayersModal({
  team,
  game,
  excludeIds,
  invitesLeft,
  onInvited,
  onClose,
}: RealInvitePlayersModalProps) {
  const [candidates, setCandidates] = useState<InviteCandidate[] | null>(null);
  const [leaderPlaystyle, setLeaderPlaystyle] = useState(3);
  const [query, setQuery] = useState("");
  const [roles, setRoles] = useState<string[]>(team.lookingFor.map((role) => role.name));
  const [minReputation, setMinReputation] = useState(0);
  const [sort, setSort] = useState<SortKey>("match");
  const [invited, setInvited] = useState<string[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialInvitesLeft] = useState(invitesLeft);

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

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      fetchInviteCandidates(supabase, game, excludeIds),
      team.leaderId
        ? supabase.from("profiles").select("playstyle").eq("id", team.leaderId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]).then(([rows, leader]) => {
      if (cancelled) return;
      setCandidates(rows);
      const playstyle = (leader.data as { playstyle: number | null } | null)?.playstyle;
      if (playstyle) setLeaderPlaystyle(playstyle);
    });
    return () => {
      cancelled = true;
    };
    // Looked up once when the picker opens; the list shouldn't reshuffle under
    // the leader's cursor as invitations go out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tiers = useMemo(() => tiersOf(game.ranks), [game]);
  const leaderOrdinal =
    game.ranks.find((rank) => rank.name === team.rank.name)?.ordinal ?? 0;

  const ranked = useMemo(() => {
    if (!candidates) return [];
    const mode = game.modes.find((entry) => entry.id === team.modeId);
    const bounds = lobbyJoinBounds(
      partyRuleFor(mode, team.slotsTotal, game.ranks),
      tiers,
      team.memberOrdinals ?? [],
      team.rankRange ? boundsFromTierRange(tiers, team.rankRange) : OPEN_BOUNDS,
    );
    return rankCandidates(
      candidates,
      { playstyle: leaderPlaystyle, wantedTags: [], rankOrdinal: leaderOrdinal },
      bounds,
    );
  }, [candidates, game, team, tiers, leaderPlaystyle, leaderOrdinal]);

  const visible = ranked
    .filter(
      ({ candidate }) =>
        roles.length === 0 || candidate.roleNames.some((name) => roles.includes(name)),
    )
    .filter(({ candidate }) => (candidate.reputation ?? 0) >= minReputation)
    .filter(({ candidate }) =>
      candidate.username.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === "reputation") {
        return (b.candidate.reputation ?? -1) - (a.candidate.reputation ?? -1);
      }
      if (sort === "rank") return a.score.deltaR - b.score.deltaR;
      return b.score.total - a.score.total;
    });

  // Counted from the number when the picker opened: the page refreshes behind
  // it after each invitation, and the prop would then drop a second time.
  const slotsLeft = initialInvitesLeft - invited.length;

  async function invite(candidate: InviteCandidate) {
    if (sending) return;
    setSending(candidate.id);
    setError(null);
    const failure = await inviteToLobby(createClient(), team.id, candidate.id);
    setSending(null);
    if (failure) {
      setError(failure);
      return;
    }
    setInvited((prev) => [...prev, candidate.id]);
    onInvited(candidate.username);
  }

  function toggleRole(name: string) {
    setRoles((prev) =>
      prev.includes(name) ? prev.filter((entry) => entry !== name) : [...prev, name],
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
        <div className="flex flex-col gap-4 border-b border-border-subtle p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-lg font-extrabold text-white">Invite players</h2>
              <p className="text-xs text-text-muted">
                Players this lobby would accept, with the best fit for {team.name} first.{" "}
                {slotsLeft > 0
                  ? `${slotsLeft} invitation${slotsLeft === 1 ? "" : "s"} left for your open slots.`
                  : "Every open slot has an invitation out."}
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
                <select
                  value={String(minReputation)}
                  onChange={(event) => setMinReputation(Number(event.target.value))}
                  aria-label="Minimum rating"
                  className="h-8 flex-1 rounded-lg border border-border-default bg-bg-page px-3 text-xs text-white focus:border-brand/60 focus:outline-none sm:w-40 sm:flex-none"
                >
                  {reputationFilterOptions.map((option) => (
                    <option key={option.value} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  aria-label="Sort by"
                  className="h-8 flex-1 rounded-lg border border-border-default bg-bg-page px-3 text-xs text-white focus:border-brand/60 focus:outline-none sm:w-40 sm:flex-none"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {game.roles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {game.roles.map((role) => {
                  const icon = roleIconFor(team.game, role.name);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      aria-pressed={roles.includes(role.name)}
                      onClick={() => toggleRole(role.name)}
                      className={chip(roles.includes(role.name))}
                    >
                      {icon && (
                        // eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization
                        <img src={icon} alt="" className="size-3" />
                      )}
                      {role.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="border-b border-danger/40 bg-danger/10 px-5 py-2.5 text-xs text-danger sm:px-6"
          >
            {error}
          </p>
        )}

        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-5 sm:p-6">
          {candidates === null && (
            <li className="py-10 text-center text-xs text-text-muted">Finding players…</li>
          )}
          {candidates !== null && visible.length === 0 && (
            <li className="py-10 text-center text-xs text-text-muted">
              {ranked.length === 0
                ? "Nobody else has set up this game yet, or nobody fits the lobby's rank."
                : "Nobody matches these filters. Try fewer roles or a lower rating."}
            </li>
          )}
          {visible.map(({ candidate }, index) => {
            const done = invited.includes(candidate.id);
            return (
              <li
                key={candidate.id}
                className="rounded-xl border border-border-default bg-bg-page/60 p-3.5"
              >
                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <PlayerAvatar
                    src={candidate.avatar}
                    name={candidate.username}
                    className="size-10 shrink-0 text-sm"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/profile/${candidate.username}`}
                        target="_blank"
                        className="truncate text-sm font-bold text-white hover:text-brand hover:underline"
                      >
                        {candidate.username}
                      </Link>
                      {sort === "match" && index === 0 && (
                        <span className="rounded bg-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-success">
                          Top pick
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-text-muted">
                      <span className="flex items-center gap-1">
                        {candidate.rankIcon && (
                          // eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization
                          <img src={candidate.rankIcon} alt="" className="size-3" />
                        )}
                        <span className="font-bold text-white/90">
                          {candidate.rank?.name ?? "Unranked"}
                        </span>
                      </span>
                      {candidate.roleNames.length > 0 && (
                        <span>{candidate.roleNames.join(", ")}</span>
                      )}
                      {candidate.reputation === null ? (
                        <span className="italic text-text-muted/70">No ratings yet</span>
                      ) : (
                        <span className="text-star">
                          ★ {candidate.reputation.toFixed(1)}
                          <span className="text-text-muted"> ({candidate.reviewCount})</span>
                        </span>
                      )}
                      {candidate.playstyle && <span>{playstyleLabels[candidate.playstyle]}</span>}
                    </div>
                    {candidate.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {candidate.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-border-default px-2 py-0.5 text-[10px] font-semibold text-text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => invite(candidate)}
                    disabled={done || slotsLeft <= 0 || sending !== null}
                    className={`ml-auto flex h-9 min-w-[84px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-opacity disabled:cursor-not-allowed ${
                      done
                        ? "border border-success/40 bg-success/10 text-success"
                        : "bg-brand text-white hover:opacity-90 disabled:opacity-40"
                    }`}
                  >
                    {done ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                        <img src="/icons/action-accept.svg" alt="" className="size-3" />
                        Invited
                      </>
                    ) : sending === candidate.id ? (
                      "Sending…"
                    ) : (
                      "Invite"
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="border-t border-border-subtle px-5 py-3 text-[11px] text-text-muted sm:px-6">
          {candidates === null
            ? "Loading…"
            : `${visible.length} of ${ranked.length} players shown. Each invitation holds one open slot until it's answered.`}
        </p>
      </div>
    </div>
  );
}
