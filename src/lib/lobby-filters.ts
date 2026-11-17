/**
 * The LFG list's filters and sort, as they appear in the URL
 * (`?q=&region=&mode=&rank=&role=&sort=`), so a filtered list can be shared
 * and the server can rank it. Shared by the page and the search bar.
 */

export const LOBBY_SORTS = ["recommended", "latest", "players", "open-slots"] as const;
export type LobbySort = (typeof LOBBY_SORTS)[number];

/** "Fits my rank" in the rank filter, and its default. */
export const FITS_MY_RANK = "me";
/** "All ranks" in the rank filter. */
export const ANY_RANK = "all";

export interface LobbyFilters {
  query: string;
  region: string;
  /** `game_modes.value`. */
  mode: string;
  /** `FITS_MY_RANK`, `ANY_RANK`, or a tier name such as "Gold". */
  rank: string;
  /** A role name. Optional by design: lobbies seeking no role always pass. */
  role: string;
  sort: LobbySort;
}

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseLobbyFilters(params: SearchParams): LobbyFilters {
  const sort = single(params.sort);
  return {
    query: single(params.q),
    region: single(params.region),
    mode: single(params.mode),
    rank: single(params.rank) || FITS_MY_RANK,
    role: single(params.role),
    sort: (LOBBY_SORTS as readonly string[]).includes(sort)
      ? (sort as LobbySort)
      : "recommended",
  };
}

/** True when the player narrowed the list beyond the defaults. */
export function isFiltered(filters: LobbyFilters): boolean {
  return Boolean(
    filters.query ||
      filters.region ||
      filters.mode ||
      filters.role ||
      filters.rank !== FITS_MY_RANK,
  );
}

export const sortLabels: Record<LobbySort, string> = {
  recommended: "Recommended",
  latest: "Latest",
  players: "Most players",
  "open-slots": "Open slots",
};

/** The URL query for these filters. Defaults are left out to keep links short. */
export function filtersToQuery(filters: LobbyFilters): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.region) params.set("region", filters.region);
  if (filters.mode) params.set("mode", filters.mode);
  if (filters.rank !== FITS_MY_RANK) params.set("rank", filters.rank);
  if (filters.role) params.set("role", filters.role);
  if (filters.sort !== "recommended") params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}
