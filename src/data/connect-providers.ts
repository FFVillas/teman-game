/**
 * The accounts a player can link, in the order they are shown: the onboarding
 * step offers them and the profile lists them (linked first, then the rest).
 * Linking isn't live yet; there is no `connected_accounts` table.
 */
export type ConnectedProvider = "discord" | "steam" | "riot";

export const connectProviders: {
  id: ConnectedProvider;
  label: string;
  caption: string;
  icon: string;
}[] = [
  {
    id: "discord",
    label: "Discord",
    caption: "Drop a voice link in your lobbies automatically.",
    icon: "/icons/social-discord.svg",
  },
  {
    id: "riot",
    label: "Riot Games",
    caption: "Keeps Valorant / LoL rank in sync once this is live.",
    icon: "/icons/player-riot.svg",
  },
  {
    id: "steam",
    label: "Steam",
    caption: "Shows on your profile for CS2 teammates.",
    icon: "/icons/player-steam.svg",
  },
];
