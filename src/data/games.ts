export interface Game {
  /** Matches `games.slug` in the database and the `/lfg/<slug>` route. */
  slug: string;
  name: string;
  image: string;
  /** Platform + genre. Factual, unlike a player count we can't measure yet. */
  meta: string;
  href?: string;
  /** Placeholder tile for titles outside the current six. */
  comingSoon?: boolean;
}

/**
 * The six titles in the thesis scope, chosen for high coordination and
 * role-dependency (MOBA and tactical FPS). See docs/thesis-spec.md. Each one
 * has its own LFG page at `/lfg/<slug>`.
 */
export const games: Game[] = [
  { slug: "valorant", name: "Valorant", image: "/games/valorant.jpg", meta: "PC · Tactical FPS", href: "/lfg/valorant" },
  { slug: "league-of-legends", name: "League of Legends", image: "/games/league-of-legends.jpg", meta: "PC · MOBA", href: "/lfg/league-of-legends" },
  { slug: "counter-strike-2", name: "Counter-Strike 2", image: "/games/counter-strike-2.jpg", meta: "PC · Tactical FPS", href: "/lfg/counter-strike-2" },
  { slug: "mobile-legends", name: "Mobile Legends: Bang Bang", image: "/games/mobile-legends.jpg", meta: "Mobile · MOBA", href: "/lfg/mobile-legends" },
  { slug: "pubg-mobile", name: "PUBG Mobile", image: "/games/pubg-battlegrounds.png", meta: "Mobile · Battle Royale", href: "/lfg/pubg-mobile" },
  { slug: "free-fire", name: "Free Fire", image: "/games/free-fire.jpg", meta: "Mobile · Battle Royale", href: "/lfg/free-fire" },
  { slug: "more-soon", name: "More soon", image: "", meta: "Other titles on the way", comingSoon: true },
];

/** A playable game by slug; undefined for unknown slugs and the "More soon" tile. */
export function gameBySlug(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug && !game.comingSoon);
}

/**
 * Cover art for a game by its name. The names here match `games.name` in the
 * database, so the catalog fetched from Supabase can find its artwork without
 * the database storing any image paths.
 */
export function gameCoverFor(name: string): string {
  return games.find((game) => game.name === name)?.image ?? "";
}
