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
  "mobile-legends": 4,
  "pubg-mobile": 4,
  "free-fire": 4,
  // Counter-Strike 2 has none yet, so its lobbies fall back to the card art.
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

/**
 * Where the subject of each cover sits (CSS `object-position`, x% y%), so a
 * crop keeps the character in frame whatever the frame's shape: the tall strip
 * beside a card on desktop, the wide band above it on a phone, the banner on
 * the lobby page. Picked by eye from each image; anything missing falls back
 * to the top-centre that `object-top` used to give everywhere.
 */
const coverFocus: Record<string, string> = {
  "valorant/1": "40% 25%",
  "valorant/2": "55% 35%",
  "valorant/3": "50% 35%",
  "valorant/4": "50% 45%",
  "league-of-legends/1": "50% 40%",
  "league-of-legends/2": "45% 45%",
  "league-of-legends/3": "40% 45%",
  "league-of-legends/4": "55% 40%",
  "mobile-legends/1": "55% 15%",
  "mobile-legends/2": "50% 70%",
  "mobile-legends/3": "45% 55%",
  "mobile-legends/4": "50% 45%",
  "pubg-mobile/1": "60% 55%",
  "pubg-mobile/2": "45% 50%",
  "pubg-mobile/3": "50% 30%",
  "pubg-mobile/4": "50% 20%",
  "free-fire/1": "45% 50%",
  "free-fire/2": "15% 60%",
  "free-fire/3": "50% 35%",
  "free-fire/4": "50% 12%",
};

/** `object-position` for a cover image path (from `coverSrc`). */
export function coverPosition(src: string | null | undefined): string {
  const key = src?.match(/\/lfg\/covers\/([a-z0-9-]+\/[0-9]{1,2})\.webp$/)?.[1];
  return (key && coverFocus[key]) || "50% 0%";
}

/** The image to show for a lobby's stored cover key. */
export function coverSrc(
  gameSlug: string,
  key: string | null | undefined,
): string {
  if (key && /^[a-z0-9-]+\/[0-9]{1,2}$/.test(key)) return `/lfg/covers/${key}.webp`;
  return gameBySlug(gameSlug)?.image ?? "";
}
