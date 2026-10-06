/**
 * Rank badge art, in `public/ranks/<game>/`. Valorant has one image per
 * division (`gold-3.webp`, matching the game's own badges); League of Legends
 * has one per tier (`gold.webp`), because its crests carry no division.
 * Games missing here have no art yet, and `RankRangeBadge` falls back to a
 * plain marker for them.
 *
 * Source and rights notes: docs/image-credits.md.
 */
const keyedBy: Record<string, "name" | "tier"> = {
  valorant: "name",
  "league-of-legends": "tier",
};

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The badge image for a rank, or undefined when the game has no art yet. */
export function rankIconFor(
  gameSlug: string,
  rank: { name: string; tier: string },
): string | undefined {
  const key = keyedBy[gameSlug];
  if (!key) return undefined;
  return `/ranks/${gameSlug}/${slugify(rank[key])}.webp`;
}
