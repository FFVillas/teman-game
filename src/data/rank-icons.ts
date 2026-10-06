import { lfgRanks } from "./lfg-ranks";

/**
 * Rank badge art by game and tier name. Only the tiers whose images exist are
 * listed; everything else falls back to a plain marker in `RankRangeBadge`.
 * Add a line here when a tier's image lands in `public/icons/`.
 */
const icons: Record<string, Record<string, { icon: string; colorClass: string }>> = {
  valorant: {
    Silver: lfgRanks.silver,
    Ascendant: lfgRanks.ascendant,
    Immortal: lfgRanks.immortal,
    Radiant: lfgRanks.radiant,
  },
};

export function rankIconFor(gameSlug: string, tier: string) {
  return icons[gameSlug]?.[tier];
}
