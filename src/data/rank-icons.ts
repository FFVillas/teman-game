/**
 * Rank badge art, in `public/ranks/<game>/`.
 *
 * Valorant is keyed per division (`gold-3.webp`) because its badges really do
 * differ per division. The rest are keyed per tier (`gold.webp`): their art
 * repeats within a tier, so one image covers Gold I through Gold IV and the
 * division shows as text beside it.
 *
 * Games missing here have no art yet, and `RankRangeBadge` falls back to a
 * plain marker for them — PUBG Mobile is still in that state.
 *
 * Source and rights notes: docs/image-credits.md.
 */
const keyedBy: Record<string, "name" | "tier"> = {
  valorant: "name",
  "league-of-legends": "tier",
  "mobile-legends": "tier",
  "free-fire": "tier",
  "counter-strike-2": "tier",
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
