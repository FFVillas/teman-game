export interface DiscoverPlayer {
  id: string;
  name: string;
  avatar: string;
  game: string;
  rank: string;
}

export const discoverPlayers: DiscoverPlayer[] = [
  { id: "d1", name: "BlitzKrieger", avatar: "/lfg/avatars/avatar-2.jpg", game: "Valorant", rank: "Diamond" },
  { id: "d2", name: "SilentAsh", avatar: "/lfg/avatars/avatar-3.jpg", game: "Valorant", rank: "Platinum" },
  { id: "d3", name: "RuneMaster", avatar: "/lfg/avatars/avatar-4.jpg", game: "LoL", rank: "Gold" },
  { id: "d4", name: "ZeroCool", avatar: "/lfg/avatars/avatar-5.jpg", game: "CSGO 2", rank: "Faceit 8" },
  { id: "d5", name: "NovaBlaze", avatar: "/lfg/avatars/avatar-6.jpg", game: "Free Fire", rank: "Heroic" },
  { id: "d6", name: "EchoPrime", avatar: "/lfg/avatars/avatar-7.jpg", game: "PUBG", rank: "Ace" },
];
