/**
 * What to ask a player for each game's account, and how to check it. The
 * formats come from guides and news pages, not the publishers' own
 * documentation, so check each one in the game before tightening a rule:
 * `docs/game-reference.md` ("Accounts") has the notes and sources.
 *
 * Three possible fields, mapped to `user_game_mapping`:
 *  - `ign`  → `in_game_name`  (Riot ID, Steam name, or nickname)
 *  - `id`   → `account_id`    (Player ID, UID, Character ID; digits only)
 *  - `zone` → `zone_id`       (Mobile Legends only; digits only)
 */

export type IdentityKey = "ign" | "id" | "zone";

export interface IdentityField {
  key: IdentityKey;
  label: string;
  placeholder: string;
  /** Digits only, so the field can show a number pad on mobile. */
  numeric?: boolean;
  /** Checked only once something is typed. */
  pattern?: RegExp;
  error?: string;
  /** Narrow fields (a short ID) sit beside a wider one. */
  narrow?: boolean;
}

export interface IdentityFormat {
  fields: IdentityField[];
  /** Where the player finds it in the game. */
  where: string;
  note?: string;
}

export const identityFormats: Record<string, IdentityFormat> = {
  valorant: {
    fields: [
      {
        key: "ign",
        label: "Riot ID",
        placeholder: "YourName#TAG",
        pattern: /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/,
        error: "Use Name#TAG: a 3 to 16 character name, then # and a 3 to 5 character tag.",
      },
    ],
    where: "In the game's main menu (top left), or the Riot Client.",
    note: "One Riot ID covers Valorant and League of Legends.",
  },
  "league-of-legends": {
    fields: [
      {
        key: "ign",
        label: "Riot ID",
        placeholder: "YourName#TAG",
        pattern: /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/,
        error: "Use Name#TAG: a 3 to 16 character name, then # and a 3 to 5 character tag.",
      },
    ],
    where: "In the League client (profile), or the Riot Client.",
    note: "Same Riot ID as Valorant.",
  },
  "counter-strike-2": {
    fields: [
      {
        key: "ign",
        label: "Steam name",
        placeholder: "Your Steam profile name",
      },
    ],
    where: "Your Steam profile. A Steam link can come later with Connections.",
    note: "CS2 has no separate in-game ID.",
  },
  "mobile-legends": {
    fields: [
      { key: "ign", label: "Nickname", placeholder: "Your in-game name" },
      {
        key: "id",
        label: "Player ID",
        placeholder: "12345678",
        numeric: true,
        narrow: true,
        pattern: /^\d{6,12}$/,
        error: "Digits only.",
      },
      {
        key: "zone",
        label: "Zone ID",
        placeholder: "1234",
        numeric: true,
        narrow: true,
        pattern: /^\d{3,6}$/,
        error: "Digits only.",
      },
    ],
    where: "Profile (top-left avatar). The game shows it as 12345678 (1234): the number first, the zone in brackets.",
    note: "Both numbers are needed to find the account; people often swap them.",
  },
  "free-fire": {
    fields: [
      { key: "ign", label: "Nickname", placeholder: "Your in-game name" },
      {
        key: "id",
        label: "UID",
        placeholder: "123456789",
        numeric: true,
        narrow: true,
        pattern: /^\d{9,10}$/,
        error: "A UID is 9 or 10 digits.",
      },
    ],
    where: "Profile (top-left avatar), under your nickname.",
    note: "The UID never changes; the nickname can.",
  },
  "pubg-mobile": {
    fields: [
      { key: "ign", label: "Character name", placeholder: "Your in-game name" },
      {
        key: "id",
        label: "Character ID",
        placeholder: "5123456789",
        numeric: true,
        narrow: true,
        pattern: /^\d{9,11}$/,
        error: "Digits only (usually 9 to 11).",
      },
    ],
    where: "Tap your avatar: the ID and name are both shown with a copy button.",
    note: "The ID can't be changed; the name can with a rename card.",
  },
};

export const fallbackFormat: IdentityFormat = {
  fields: [{ key: "ign", label: "In-game name", placeholder: "Your in-game name" }],
  where: "In the game's profile.",
};

export const formatFor = (slug: string): IdentityFormat =>
  identityFormats[slug] ?? fallbackFormat;


/**
 * The first thing wrong with what was typed, or null. Empty fields are fine
 * (every field is optional); only something typed in the wrong shape counts.
 */
export function accountProblem(
  slug: string,
  values: Record<IdentityKey, string>,
): string | null {
  for (const field of formatFor(slug).fields) {
    const value = values[field.key].trim();
    if (value && field.pattern && !field.pattern.test(value)) {
      return `${field.label}: ${field.error ?? "that doesn't look right."}`;
    }
  }
  return null;
}
