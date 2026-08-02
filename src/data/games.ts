export interface Game {
  name: string;
  image: string;
  activeLfg: string;
  href?: string;
  comingSoon?: boolean;
}

// NOTE: every game currently points at the Valorant LFG page as a placeholder —
// swap each href for its own /lfg/<game> route as those pages get built.
const LFG_PLACEHOLDER = "/lfg/valorant";

export const games: Game[] = [
  { name: "League of Legends", image: "/games/league-of-legends.jpg", activeLfg: "4.2k Active LFG", href: LFG_PLACEHOLDER },
  { name: "Valorant", image: "/games/valorant.jpg", activeLfg: "4.2k Active LFG", href: LFG_PLACEHOLDER },
  { name: "Counter-Strike 2", image: "/games/counter-strike-2.jpg", activeLfg: "4.2k Active LFG", href: LFG_PLACEHOLDER },
  { name: "Mobile Legends: Bang Bang", image: "/games/mobile-legends.jpg", activeLfg: "4.2k Active LFG", href: LFG_PLACEHOLDER },
  { name: "Free Fire", image: "/games/free-fire.jpg", activeLfg: "4.2k Active LFG", href: LFG_PLACEHOLDER },
  { name: "PUBG: BATTLEGROUNDS", image: "/games/pubg-battlegrounds.png", activeLfg: "4.2k Active LFG", href: LFG_PLACEHOLDER },
  { name: "COMING SOON", image: "", activeLfg: "", comingSoon: true },
];
