export interface Game {
  name: string;
  image: string;
  activeLfg: string;
  comingSoon?: boolean;
}

export const games: Game[] = [
  { name: "League of Legends", image: "/games/league-of-legends.jpg", activeLfg: "4.2k Active LFG" },
  { name: "Valorant", image: "/games/valorant.jpg", activeLfg: "4.2k Active LFG" },
  { name: "Counter-Strike 2", image: "/games/counter-strike-2.jpg", activeLfg: "4.2k Active LFG" },
  { name: "Mobile Legends: Bang Bang", image: "/games/mobile-legends.jpg", activeLfg: "4.2k Active LFG" },
  { name: "Free Fire", image: "/games/free-fire.jpg", activeLfg: "4.2k Active LFG" },
  { name: "PUBG: BATTLEGROUNDS", image: "/games/pubg-battlegrounds.png", activeLfg: "4.2k Active LFG" },
  { name: "COMING SOON", image: "", activeLfg: "", comingSoon: true },
];
