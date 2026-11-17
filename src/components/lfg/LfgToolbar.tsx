import Link from "next/link";
import LfgSort from "./LfgSort";
import type { LobbyFilters } from "@/lib/lobby-filters";

interface LfgToolbarProps {
  /** `game.slug`; the create link goes to this game's form. */
  gameSlug: string;
  resultCount: number;
  filters: LobbyFilters;
}

export default function LfgToolbar({ gameSlug, resultCount, filters }: LfgToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
      <Link
        href={`/lfg/${gameSlug}/create`}
        className="flex h-[34px] shrink-0 items-center justify-center rounded-lg bg-brand px-[14px] text-[12px] font-bold text-white transition-opacity hover:opacity-90"
      >
        + Create Team
      </Link>

      <div className="flex items-center gap-2.5">
        <h2 className="text-lg font-bold text-white">
          {filters.sort === "recommended" ? "Recommended Teams" : "Teams"}
        </h2>
        <span className="rounded-md bg-brand/10 px-2 py-1 text-xs font-bold text-brand">
          {resultCount} Available
        </span>
      </div>

      <LfgSort filters={filters} />
    </div>
  );
}
