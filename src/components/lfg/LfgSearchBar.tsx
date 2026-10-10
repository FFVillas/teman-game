"use client";

import { useMemo, useState } from "react";
import FormDropdown from "@/components/FormDropdown";
import { regionsFor } from "@/data/game-regions";
import type { GameInfo } from "@/lib/games";
import { tiersOf } from "@/lib/ranks";

const FITS_ME = "__me__";

/**
 * The search/filter bar, split out of LfgHero so it can sit right above the
 * team list instead of at the very top of the page. Keeps the title close
 * to the fold while putting search next to what it filters.
 *
 * Region, mode and rank come from the game being browsed, so each game's page
 * offers its own choices (a Counter-Strike player is never asked for a
 * Valorant rank). The filters are not wired to the list yet; that arrives
 * with real lobbies.
 *
 * "Rank" is one dropdown with three kinds of value: "Fits my rank" (the
 * default for a signed-in player with a rank), "All ranks", or a tier
 * (Silver, Gold…). Each means "lobbies that would accept it": the leader's
 * range and the game's party rule applied to who is already in
 * (`boundsAcceptTier` in lib/ranks.ts). The leader's own rank is not a
 * filter; it only orders the results.
 */
export default function LfgSearchBar({
  gameSlug,
  game,
  myRank,
}: {
  gameSlug: string;
  /** The game's ranks from the database. Missing if the catalog couldn't load. */
  game?: GameInfo;
  /** The signed-in viewer's rank in this game, e.g. "Gold 2"; "" if unknown. */
  myRank?: string;
}) {
  const regions = regionsFor(gameSlug).options;
  const modes = game?.modes ?? [];
  const tiers = useMemo(() => tiersOf(game?.ranks ?? []), [game]);

  const [region, setRegion] = useState("");
  const [mode, setMode] = useState("");
  // "__me__" stands for the viewer's own rank; "" is "All ranks".
  const [rankChoice, setRankChoice] = useState(myRank ? FITS_ME : "");

  return (
    // `relative z-30` is load-bearing: backdrop-blur makes this bar its own
    // stacking layer, so without it the dropdown menus (which hang below the
    // bar) are painted *under* the lobby cards that come after it. The navbar
    // is z-50, so it still sits above this.
    <div className="relative z-30 flex flex-col gap-3 rounded-xl border border-white/10 bg-bg-card-alt/80 p-4 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <label
          htmlFor="lfg-search"
          className="text-[11px] font-semibold uppercase tracking-wider text-text-muted"
        >
          Search Teams
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
            type="text"
            placeholder="Search by team name or keyword..."
            className="h-10 w-full rounded-lg border border-white/10 bg-[#0e1015] pl-9 pr-4 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:w-44">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Region
        </span>
        <FormDropdown
          size="bar"
          label="Region"
          placeholder="All regions"
          value={region}
          onChange={setRegion}
          options={regions}
        />
      </div>

      {modes.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:w-44">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Mode
          </span>
          <FormDropdown
            size="bar"
            label="Mode"
            placeholder="All modes"
            value={mode}
            onChange={setMode}
            options={modes.map((m) => ({ value: m.value, label: m.label }))}
          />
        </div>
      )}

      {tiers.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:w-44">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Rank
          </span>
          <FormDropdown
            size="bar"
            label="Rank"
            placeholder="All ranks"
            value={rankChoice}
            onChange={setRankChoice}
            options={[
              ...(myRank ? [{ value: FITS_ME, label: "Fits my rank" }] : []),
              ...tiers.map((tier) => ({ value: tier.name, label: tier.name })),
            ]}
          />
        </div>
      )}

      <button
        type="button"
        className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-5 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/lfg-search-btn.svg" alt="" className="size-3" />
        Search
      </button>
    </div>
  );
}
