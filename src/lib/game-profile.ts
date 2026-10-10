import { accountProblem } from "@/data/game-accounts";

/**
 * What a player enters for one game, in onboarding and on the edit form.
 * Values are names and codes as shown in the UI; they are turned into
 * database ids when saved, because rank and role names are unique within a
 * game.
 */
export interface GameProfile {
  /** `in_game_name`: a Riot ID, a Steam name, or a nickname, depending on the game. */
  username: string;
  /** `account_id`: Player ID, UID or Character ID. Digits only. Empty where a game has none. */
  accountId: string;
  /** `zone_id`: Mobile Legends only. Digits only. */
  zoneId: string;
  /** A value from game-regions.ts. Empty means "the game's default". */
  region: string;
  /** Rank name, e.g. "Gold 2". Empty means not set. */
  rank: string;
  /** Role names. Only games that define roles have any. */
  roles: string[];
  /** The roles they favour: always a subset of `roles`. */
  favoriteRoles: string[];
}

export const emptyGameProfile: GameProfile = {
  username: "",
  accountId: "",
  zoneId: "",
  region: "",
  rank: "",
  roles: [],
  favoriteRoles: [],
};

/** The first thing wrong with the account fields of one game, or null. */
export function gameProfileProblem(
  slug: string,
  profile: Pick<GameProfile, "username" | "accountId" | "zoneId">,
): string | null {
  return accountProblem(slug, {
    ign: profile.username,
    id: profile.accountId,
    zone: profile.zoneId,
  });
}
