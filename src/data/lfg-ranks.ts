export interface LfgRank {
  name: string;
  icon: string;
  colorClass: string;
}

export const lfgRanks = {
  immortal: {
    name: "Immortal",
    icon: "/ranks/valorant/immortal-2.webp",
    colorClass: "text-[#ae3671]",
  },
  radiant: {
    name: "Radiant",
    icon: "/ranks/valorant/radiant.webp",
    colorClass: "text-[#ffffb4]",
  },
  silver: {
    name: "Silver",
    icon: "/ranks/valorant/silver-2.webp",
    colorClass: "text-[#d8dddb]",
  },
  ascendant: {
    name: "Ascendant",
    icon: "/ranks/valorant/ascendant-2.webp",
    colorClass: "text-[#3ab87c]",
  },
} satisfies Record<string, LfgRank>;
