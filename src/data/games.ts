export interface Game {
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
  { name: "Valorant", image: "/games/valorant.jpg", meta: "PC · Tactical FPS", href: LFG_PLACEHOLDER },
  { name: "League of Legends", image: "/games/league-of-legends.jpg", meta: "PC · MOBA", href: LFG_PLACEHOLDER },
  { name: "Counter-Strike 2", image: "/games/counter-strike-2.jpg", meta: "PC · Tactical FPS", href: LFG_PLACEHOLDER },
  { name: "Mobile Legends: Bang Bang", image: "/games/mobile-legends.jpg", meta: "Mobile · MOBA", href: LFG_PLACEHOLDER },
  { name: "PUBG Mobile", image: "/games/pubg-battlegrounds.png", meta: "Mobile · Battle Royale", href: LFG_PLACEHOLDER },
  { name: "Free Fire", image: "/games/free-fire.jpg", meta: "Mobile · Battle Royale", href: LFG_PLACEHOLDER },
  { name: "More soon", image: "", meta: "Other titles on the way", comingSoon: true },
];
