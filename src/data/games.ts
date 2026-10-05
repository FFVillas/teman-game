export interface Game {
  /** Matches `games.slug` in the database — the stable id across the app. */
  slug: string;
  name: string;
  image: string;
  /** Platform + genre. Factual, unlike a player count we can't measure yet. */
  meta: string;
  href?: string;
  /** Placeholder tile for titles outside the current six. */
  comingSoon?: boolean;
}

// NOTE: every game currently points at the Valorant LFG page as a placeholder —
// swap each href for its own /lfg/<game> route as those pages get built.
const LFG_PLACEHOLDER = "/lfg/valorant";

/**
 * The six titles in the thesis scope, chosen for high coordination and
 * role-dependency (MOBA and tactical FPS). See docs/thesis-spec.md.
 */
export const games: Game[] = [
  { slug: "valorant", name: "Valorant", image: "/games/valorant.jpg", meta: "PC · Tactical FPS", href: LFG_PLACEHOLDER },
  { slug: "league-of-legends", name: "League of Legends", image: "/games/league-of-legends.jpg", meta: "PC · MOBA", href: LFG_PLACEHOLDER },
  { slug: "counter-strike-2", name: "Counter-Strike 2", image: "/games/counter-strike-2.jpg", meta: "PC · Tactical FPS", href: LFG_PLACEHOLDER },
  { slug: "mobile-legends", name: "Mobile Legends: Bang Bang", image: "/games/mobile-legends.jpg", meta: "Mobile · MOBA", href: LFG_PLACEHOLDER },
  { slug: "pubg-mobile", name: "PUBG Mobile", image: "/games/pubg-battlegrounds.png", meta: "Mobile · Battle Royale", href: LFG_PLACEHOLDER },
  { slug: "free-fire", name: "Free Fire", image: "/games/free-fire.jpg", meta: "Mobile · Battle Royale", href: LFG_PLACEHOLDER },
  { slug: "more-soon", name: "More soon", image: "", meta: "Other titles on the way", comingSoon: true },
];

/** The six in scope — i.e. everything except the "more soon" placeholder. */
export const playableGames = games.filter((game) => !game.comingSoon);

export function gameBySlug(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}

export function gameByName(name: string): Game | undefined {
  return games.find((game) => game.name === name);
}

/**
 * Published rank ladders, for the games whose ladder is a fixed list. Used
 * as dropdown options so profiles stay comparable (and, later, so the rank
 * penalty `M` in the matching score has an ordinal to work with).
 *
 * Games missing here take free text instead — CS2 ranks by a Premier
 * rating number, and the battle royales change their ladder per season, so
 * a fixed list would be wrong more often than right.
 */
export const gameRankOptions: Record<string, string[]> = {
  valorant: [
    "Iron", "Bronze", "Silver", "Gold", "Platinum",
    "Diamond", "Ascendant", "Immortal", "Radiant",
  ],
  "league-of-legends": [
    "Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald",
    "Diamond", "Master", "Grandmaster", "Challenger",
  ],
  "mobile-legends": [
    "Warrior", "Elite", "Master", "Grandmaster", "Epic",
    "Legend", "Mythic", "Mythical Honor", "Mythical Glory",
  ],
};

/** Role vocabularies, same idea: a fixed list where the game has one. */
export const gameRoleOptions: Record<string, string[]> = {
  valorant: ["Duelist", "Initiator", "Sentinel", "Controller"],
  "league-of-legends": ["Top", "Jungle", "Mid", "Bot", "Support"],
  "mobile-legends": ["Gold", "EXP", "Mid", "Jungle", "Roam"],
};
