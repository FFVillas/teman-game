/**
 * Region choices per game, keyed by the game's slug (`games.slug`).
 *
 * `value` is what `user_game_mapping.region` stores; `label` is what the
 * player sees. A region is a group of players who can actually play together,
 * never a country. Games that define their own regions use those exactly
 * (Valorant, League of Legends, PUBG Mobile); the others use shared names and
 * are limited to Asia, because the audience is Indonesia and the non-Asian
 * server lists could not be confirmed. See docs/game-reference.md ("Region
 * options") for the reasoning and the open questions.
 *
 * Not yet a database table on purpose: whether it should become one
 * (`game_regions`) is still undecided, and this list is easy to move.
 */

export interface GameRegion {
  value: string;
  label: string;
}

export interface GameRegionList {
  options: GameRegion[];
  /** Pre-selected for a new player: the Indonesia-first choice. */
  default: string;
}

const regionLists: Record<string, GameRegionList> = {
  valorant: {
    default: "AP",
    options: [
      { value: "AP", label: "Asia Pacific (AP)" },
      { value: "KR", label: "Korea (KR)" },
      { value: "EU", label: "Europe (EU)" },
      { value: "NA", label: "North America (NA)" },
      { value: "LATAM", label: "Latin America (LATAM)" },
      { value: "BR", label: "Brazil (BR)" },
    ],
  },
  "league-of-legends": {
    default: "SEA",
    options: [
      { value: "SEA", label: "Southeast Asia (SEA)" },
      { value: "VN2", label: "Vietnam (VN)" },
      { value: "TW2", label: "Taiwan, Hong Kong, Macao (TW)" },
      { value: "JP1", label: "Japan (JP)" },
      { value: "KR", label: "Korea (KR)" },
      { value: "OC1", label: "Oceania (OCE)" },
      { value: "ME1", label: "Middle East (ME)" },
      { value: "NA1", label: "North America (NA)" },
      { value: "EUW1", label: "Europe West (EUW)" },
      { value: "EUN1", label: "Europe Nordic & East (EUNE)" },
      { value: "BR1", label: "Brazil (BR)" },
      { value: "LA1", label: "Latin America North (LAN)" },
      { value: "LA2", label: "Latin America South (LAS)" },
      { value: "TR1", label: "Turkey (TR)" },
    ],
  },
  "pubg-mobile": {
    default: "ASIA",
    options: [
      { value: "ASIA", label: "Asia" },
      { value: "KRJP", label: "Korea and Japan" },
      { value: "ME", label: "Middle East" },
    ],
  },
  "counter-strike-2": {
    default: "SEA",
    options: [
      { value: "SEA", label: "Southeast Asia" },
      { value: "EAST_ASIA", label: "East Asia" },
      { value: "SOUTH_ASIA", label: "South Asia" },
      { value: "MIDDLE_EAST", label: "Middle East" },
    ],
  },
  "mobile-legends": {
    default: "SEA",
    options: [
      { value: "SEA", label: "Southeast Asia" },
      { value: "EAST_ASIA", label: "East Asia (Japan, Korea)" },
      { value: "MIDDLE_EAST", label: "Middle East" },
    ],
  },
  "free-fire": {
    default: "SEA",
    options: [
      { value: "SEA", label: "Southeast Asia" },
      { value: "SOUTH_ASIA", label: "South Asia" },
      { value: "EAST_ASIA", label: "East Asia (Taiwan)" },
      { value: "MIDDLE_EAST", label: "Middle East" },
    ],
  },
};

/** Falls back to a single Southeast Asia choice for a game we have no list for. */
const fallback: GameRegionList = {
  default: "SEA",
  options: [{ value: "SEA", label: "Southeast Asia" }],
};

export function regionsFor(gameSlug: string): GameRegionList {
  return regionLists[gameSlug] ?? fallback;
}

/** The label for a stored value, or the raw value if the list changed since. */
export function regionLabel(gameSlug: string, value: string | null): string {
  if (!value) return "";
  return (
    regionsFor(gameSlug).options.find((option) => option.value === value)
      ?.label ?? value
  );
}
