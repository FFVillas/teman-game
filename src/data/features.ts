export interface Feature {
  icon: string;
  iconWidth: number;
  iconHeight: number;
  title: string;
  description: string;
}

export const features: Feature[] = [
  {
    icon: "/icons/feature-matchmaking.svg",
    iconWidth: 20,
    iconHeight: 20,
    title: "Global Matchmaking",
    description: "Find and connect with players across all regions and servers effortlessly.",
  },
  {
    icon: "/icons/feature-verified.svg",
    iconWidth: 25,
    iconHeight: 20,
    title: "Verified Profiles",
    description: "Say goodbye to bots and toxicity. Play with real, ranked-verified humans.",
  },
  {
    icon: "/icons/feature-filters.svg",
    iconWidth: 20,
    iconHeight: 20,
    title: "Skill-Based Filters",
    description: "Granular filtering by rank, KDA, role, and specific playstyles.",
  },
  {
    icon: "/icons/feature-chat.svg",
    iconWidth: 25,
    iconHeight: 20,
    title: "Instant Chat",
    description: "Seamlessly coordinate strategies with your team before heading into the lobby.",
  },
];
