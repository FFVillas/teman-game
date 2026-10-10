import { formatFor, type IdentityKey } from "@/data/game-accounts";

export * from "@/data/game-accounts";

// TEMPORARY (dev gallery): the ID formats now live in src/data/game-accounts.ts
// (the real forms use them); what's left here is only for the drafts.

/**
 * What would be stored today. `user_game_mapping.in_game_name` is one text
 * column (40 characters), so several fields are joined into one string. A
 * separate column per field is the alternative if the IDs need to be searched.
 */
export function composeIgn(
  slug: string,
  values: Record<IdentityKey, string>,
): string {
  const format = formatFor(slug);
  const name = values.ign.trim();
  const id = values.id.trim();
  const zone = values.zone.trim();
  if (format.fields.some((field) => field.key === "id")) {
    const tail = [id, zone ? `(${zone})` : ""].filter(Boolean).join(" ");
    return [name, tail].filter(Boolean).join(" · ");
  }
  return name;
}

export const sources: { label: string; href: string }[] = [
  { label: "Riot ID rules (name and tagline lengths)", href: "https://www.esports.net/news/valorant/change-riot-id-tagline-valorant/" },
  { label: "PUBG Mobile: finding your ID and name", href: "https://www.sportskeeda.com/esports/how-find-pubg-mobile-id-character-name" },
  { label: "Free Fire UID guide", href: "https://marix.app/library/instructions/free-fire-uid-topup-guide" },
  { label: "Mobile Legends: User ID and Zone ID", href: "https://www.vcgamers.com/news/en/?p=223711" },
  { label: "What LFG tools collect (role, rank, region, language, playstyle, availability)", href: "https://www.exitlag.com/blog/lfg-valorant/" },
];
