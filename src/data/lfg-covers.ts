import { gameBySlug } from "@/data/games";

/**
 * Cover art a lobby can use, per game: `public/lfg/covers/<slug>/<n>.webp`.
 * A lobby stores only the key (`valorant/3`), never a path or URL. Games with
 * no covers yet fall back to their landing-page card art, so a lobby always
 * has a picture. Add a count here when more covers land (see
 * docs/image-credits.md for where they came from).
 */
const coverCounts: Record<string, number> = {
  valorant: 4,
  "league-of-legends": 4,
};

export function coverKeysFor(gameSlug: string): string[] {
  return Array.from(
    { length: coverCounts[gameSlug] ?? 0 },
    (_, index) => `${gameSlug}/${index + 1}`,
  );
}

/** A random cover for a new lobby; null when the game has none yet. */
export function randomCoverKey(gameSlug: string): string | null {
  const keys = coverKeysFor(gameSlug);
  return keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : null;
}

/** The image to show for a lobby's stored cover key. */
export function coverSrc(
  gameSlug: string,
  key: string | null | undefined,
): string {
  if (key && /^[a-z0-9-]+\/[0-9]{1,2}$/.test(key)) return `/lfg/covers/${key}.webp`;
  return gameBySlug(gameSlug)?.image ?? "";
}
