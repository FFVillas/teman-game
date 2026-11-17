"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import FormDropdown from "@/components/FormDropdown";
import { regionsFor } from "@/data/game-regions";
import type { GameInfo } from "@/lib/games";
import { ANY_RANK, FITS_MY_RANK, type LobbyFilters } from "@/lib/lobby-filters";
import { tiersOf } from "@/lib/ranks";
import { useLobbyFilters } from "@/lib/use-lobby-filters";

const SEARCH_DELAY_MS = 300;

/**
 * The search/filter bar, split out of LfgHero so it can sit right above the
 * team list instead of at the very top of the page. Keeps the title close
 * to the fold while putting search next to what it filters.
 *
 * Region, mode, rank and role come from the game being browsed, so each
 * game's page offers its own choices (a Counter-Strike player is never asked
 * for a Valorant rank). The filters live in the URL and the server applies
 * them (`lib/lobby-ranking.ts`). Everything applies as you go: dropdowns at
 * once, the text a moment after you stop typing.
 *
 * "Rank" means "lobbies that would accept it": the leader's range and the
 * game's party rule applied to who is already in. "Fits my rank" is the
 * default. "Role" is optional on purpose: lobbies that name no role always
 * stay, since players often switch roles for a team.
 */
export default function LfgSearchBar({
  gameSlug,
  game,
  filters,
  myRank,
}: {
  gameSlug: string;
  /** The game's ranks from the database. Missing if the catalog couldn't load. */
  game?: GameInfo;
  filters: LobbyFilters;
  /** The signed-in viewer's rank in this game, e.g. "Gold 2"; "" if unknown. */
  myRank?: string;
}) {
  const regions = regionsFor(gameSlug).options;
  const modes = game?.modes ?? [];
  const roles = game?.roles ?? [];
  const tiers = useMemo(() => tiersOf(game?.ranks ?? []), [game]);
  const { apply, isPending } = useLobbyFilters(filters);
  const [query, setQuery] = useState(filters.query);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    },
    [],
  );

  // Waits until typing pauses, so the list isn't re-read for every letter.
  function changeQuery(value: string) {
    setQuery(value);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => apply({ query: value.trim() }), SEARCH_DELAY_MS);
  }

  // Enter applies straight away instead of waiting out the pause.
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    apply({ query: query.trim() });
  }

  return (
    // `relative z-30` is load-bearing: backdrop-blur makes this bar its own
    // stacking layer, so without it the dropdown menus (which hang below the
    // bar) are painted *under* the lobby cards that come after it. The navbar
    // is z-50, so it still sits above this.
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-busy={isPending}
      className="relative z-30 flex flex-col gap-3 rounded-xl border border-white/10 bg-bg-card-alt/80 p-4 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex w-full flex-col gap-1.5">
        <label
          htmlFor="lfg-search"
          className="text-[11px] font-semibold uppercase tracking-wider text-text-muted"
        >
          Search Lobbies
        </label>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img
            src="/icons/lfg-search.svg"
            alt=""
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2"
          />
          <input
            id="lfg-search"
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Lobby name, leader or keyword"
            className="h-10 w-full rounded-lg border border-white/10 bg-[#0e1015] pl-9 pr-4 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:min-w-[150px] sm:flex-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Region
        </span>
        <FormDropdown
          size="bar"
          label="Region"
          placeholder="All regions"
          value={filters.region}
          onChange={(region) => apply({ region })}
          options={regions}
        />
      </div>

      {modes.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:min-w-[150px] sm:flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Mode
          </span>
          <FormDropdown
            size="bar"
            label="Mode"
            placeholder="All modes"
            value={filters.mode}
            onChange={(mode) => apply({ mode })}
            options={modes.map((m) => ({ value: m.value, label: m.label }))}
          />
        </div>
      )}

      {tiers.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:min-w-[150px] sm:flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Rank
          </span>
          <FormDropdown
            size="bar"
            label="Rank"
            allowEmpty={false}
            value={filters.rank}
            onChange={(rank) => apply({ rank })}
            options={[
              {
                value: FITS_MY_RANK,
                label: myRank ? `Fits my rank (${myRank})` : "Fits my rank",
              },
              { value: ANY_RANK, label: "All ranks" },
              ...tiers.map((tier) => ({ value: tier.name, label: tier.name })),
            ]}
          />
        </div>
      )}

      {roles.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:min-w-[150px] sm:flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Role
          </span>
          <FormDropdown
            size="bar"
            label="Role"
            placeholder="Any role"
            value={filters.role}
            onChange={(role) => apply({ role })}
            options={roles.map((role) => ({ value: role.name, label: role.name }))}
          />
        </div>
      )}

    </form>
  );
}
