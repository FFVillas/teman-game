export interface LfgRank {
  name: string;
  icon: string;
  colorClass: string;
}

export const lfgRanks = {
  immortal: {
    name: "Immortal",
    icon: "/icons/rank-immortal.png",
    colorClass: "text-[#ae3671]",
  },
  radiant: {
    name: "Radiant",
    icon: "/icons/rank-radiant.png",
    colorClass: "text-[#ffffb4]",
  },
  silver: {
    name: "Silver",
    icon: "/icons/rank-silver.png",
    colorClass: "text-[#d8dddb]",
  },
  ascendant: {
    name: "Ascendant",
    icon: "/icons/rank-ascendant.png",
    colorClass: "text-[#3ab87c]",
  },
} satisfies Record<string, LfgRank>;
