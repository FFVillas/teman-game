"use client";

import SortDropdown from "./SortDropdown";
import {
  LOBBY_SORTS,
  sortLabels,
  type LobbyFilters,
  type LobbySort,
} from "@/lib/lobby-filters";
import { useLobbyFilters } from "@/lib/use-lobby-filters";

const options = LOBBY_SORTS.map((sort) => ({ value: sort, label: sortLabels[sort] }));

/** The list's sort, kept in the URL with the filters. */
export default function LfgSort({ filters }: { filters: LobbyFilters }) {
  const { apply } = useLobbyFilters(filters);
  return (
    <SortDropdown
      options={options}
      value={filters.sort}
      onChange={(sort) => apply({ sort: sort as LobbySort })}
    />
  );
}
