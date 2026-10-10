import type { SupabaseClient } from "@supabase/supabase-js";
import { regionLabel } from "@/data/game-regions";

/**
 * The games catalog (games, their rank ladders and roles) and what each
 * player has set up per game. Backed by `games`, `game_ranks`, `game_roles`,
 * `user_game_mapping` and `user_game_roles` (20261003000200_games.sql).
 * Researched values and open questions: docs/game-reference.md.
 */

export interface GameRank {
  id: number;
  /** Family used for badges and grouping, e.g. "Gold". */
  tier: string;
  /** The full label a player picks, e.g. "Gold 2". */
  name: string;
  /** Position on the ladder, 0 = lowest. ΔR = |a.ordinal − b.ordinal|. */
  ordinal: number;
  /** Free Fire only: ranked parties must share one band. Null elsewhere. */
  partyBand: number | null;
}

export interface GameRole {
  id: number;
  name: string;
}

/** A mode a lobby can be created for, with the game's party rule for it. */
export interface GameMode {
  id: number;
  /** Stable key, e.g. "competitive". */
  value: string;
  label: string;
  kind: "ranked" | "casual" | "tournament";
  /** Largest premade group the queue allows; caps a lobby's capacity. */
  maxParty: number;
  rotating: boolean;
  /** How far apart ranks in one party may be (see lib/ranks.ts). */
  partyRule: "none" | "tiers" | "steps" | "bands";
  partyMaxApart: number | null;
  /** The rule only applies to lobbies of at most this many slots. */
  partyRuleMaxCapacity: number | null;
}

export interface GameInfo {
  id: number;
  slug: string;
  name: string;
  platform: "pc" | "mobile";
  genre: string;
  /** Lowest first. */
  ranks: GameRank[];
  /** Empty for games that define no roles (CS2, PUBG Mobile, Free Fire). */
  roles: GameRole[];
  /** Group-play modes, in the order they should be offered. */
  modes: GameMode[];
}

interface GameRowFromApi {
  id: number;
  slug: string;
  name: string;
  platform: "pc" | "mobile";
  genre: string;
  game_ranks: Array<Omit<GameRank, "partyBand"> & { party_band: number | null }> | null;
  game_roles: GameRole[] | null;
  game_modes: Array<{
    id: number;
    value: string;
    label: string;
    kind: GameMode["kind"];
    max_party: number;
    rotating: boolean;
    sort_order: number;
    party_rule: GameMode["partyRule"];
    party_max_apart: number | null;
    party_rule_max_capacity: number | null;
  }> | null;
}

/** Every game with its ranks and roles, in the order they should be listed. */
export async function fetchGameCatalog(
  supabase: SupabaseClient,
): Promise<GameInfo[]> {
  const { data } = await supabase
    .from("games")
    .select(
      "id, slug, name, platform, genre, sort_order, game_ranks(id, tier, name, ordinal, party_band), game_roles(id, name), game_modes(id, value, label, kind, max_party, rotating, sort_order, party_rule, party_max_apart, party_rule_max_capacity)",
    )
    .order("sort_order");

  return ((data ?? []) as GameRowFromApi[]).map((game) => ({
    id: game.id,
    slug: game.slug,
    name: game.name,
    platform: game.platform,
    genre: game.genre,
    ranks: (game.game_ranks ?? [])
      .map((rank) => ({
        id: rank.id,
        tier: rank.tier,
        name: rank.name,
        ordinal: rank.ordinal,
        partyBand: rank.party_band,
      }))
      .sort((a, b) => a.ordinal - b.ordinal),
    roles: [...(game.game_roles ?? [])].sort((a, b) => a.id - b.id),
    modes: [...(game.game_modes ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((mode) => ({
        id: mode.id,
        value: mode.value,
        label: mode.label,
        kind: mode.kind,
        maxParty: mode.max_party,
        rotating: mode.rotating,
        partyRule: mode.party_rule,
        partyMaxApart: mode.party_max_apart,
        partyRuleMaxCapacity: mode.party_rule_max_capacity,
      })),
  }));
}

/** What a player enters for one game. Ids, not names: that's what is stored. */
export interface GameSetupInput {
  gameId: number;
  inGameName: string;
  region: string;
  rankId: number | null;
  roleIds: number[];
}

/**
 * Saves one game's setup for the signed-in player: the row in
 * `user_game_mapping`, then the full set of roles for it.
 *
 * Update first, insert only if there was no row — not an upsert. An upsert
 * compiles to INSERT … ON CONFLICT DO UPDATE SET user_id = …, game_id = …,
 * which needs UPDATE permission on those key columns, and only the editable
 * columns are granted on purpose (the same trap as `profile_private`).
 *
 * Returns an error message, or null on success.
 */
export async function saveGameSetup(
  supabase: SupabaseClient,
  userId: string,
  setup: GameSetupInput,
): Promise<string | null> {
  const fields = {
    in_game_name: setup.inGameName.trim() || null,
    region: setup.region || null,
    rank_id: setup.rankId,
  };

  const { data: updated, error: updateError } = await supabase
    .from("user_game_mapping")
    .update(fields)
    .eq("user_id", userId)
    .eq("game_id", setup.gameId)
    .select("game_id");

  if (updateError) return updateError.message;

  if ((updated?.length ?? 0) === 0) {
    const { error: insertError } = await supabase
      .from("user_game_mapping")
      .insert({ user_id: userId, game_id: setup.gameId, ...fields });
    if (insertError) return insertError.message;
  }

  // Roles are replaced as a set: clear, then add what's selected now.
  const { error: clearError } = await supabase
    .from("user_game_roles")
    .delete()
    .eq("user_id", userId)
    .eq("game_id", setup.gameId);
  if (clearError) return clearError.message;

  if (setup.roleIds.length > 0) {
    const { error: rolesError } = await supabase.from("user_game_roles").insert(
      setup.roleIds.map((roleId) => ({
        user_id: userId,
        game_id: setup.gameId,
        role_id: roleId,
      })),
    );
    if (rolesError) return rolesError.message;
  }

  return null;
}

/** A player's setup for one game, with names resolved for display. */
export interface PlayerGameSetup {
  gameSlug: string;
  gameName: string;
  inGameName: string;
  /** Display label, e.g. "Asia Pacific (AP)". Empty if none was chosen. */
  region: string;
  /** The stored value, e.g. "AP", for forms that edit it. */
  regionValue: string;
  /** Empty if the player hasn't picked a rank. */
  rank: string;
  roles: string[];
}

/**
 * Removes a game from the signed-in player's list. Their roles for it go
 * with it (the foreign key cascades). Returns an error message, or null.
 */
export async function removeGameSetup(
  supabase: SupabaseClient,
  userId: string,
  gameId: number,
): Promise<string | null> {
  const { error } = await supabase
    .from("user_game_mapping")
    .delete()
    .eq("user_id", userId)
    .eq("game_id", gameId);
  return error ? error.message : null;
}

/**
 * The signed-in viewer's rank name for one game (e.g. "Gold 2"), or "" if
 * they're signed out or haven't set one. Used to preselect "fits my rank" and
 * to show who could join a lobby the viewer leads.
 */
export async function fetchMyRankName(
  supabase: SupabaseClient,
  catalog: GameInfo[],
  gameSlug: string,
): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return "";
  const setups = await fetchPlayerGameSetups(supabase, data.user.id, catalog);
  return setups.find((setup) => setup.gameSlug === gameSlug)?.rank ?? "";
}

/** Convenience for pages: the catalog, then the player's setups from it. */
export async function fetchPlayerGames(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlayerGameSetup[]> {
  const catalog = await fetchGameCatalog(supabase);
  return fetchPlayerGameSetups(supabase, userId, catalog);
}

/**
 * Everything a player has set up, in catalog order. Takes the catalog so
 * names don't need a nested query across the composite keys.
 */
export async function fetchPlayerGameSetups(
  supabase: SupabaseClient,
  userId: string,
  catalog: GameInfo[],
): Promise<PlayerGameSetup[]> {
  const [mappings, roleRows] = await Promise.all([
    supabase
      .from("user_game_mapping")
      .select("game_id, in_game_name, region, rank_id")
      .eq("user_id", userId),
    supabase
      .from("user_game_roles")
      .select("game_id, role_id")
      .eq("user_id", userId),
  ]);

  const roleIdsByGame = new Map<number, number[]>();
  for (const row of (roleRows.data ?? []) as { game_id: number; role_id: number }[]) {
    roleIdsByGame.set(row.game_id, [
      ...(roleIdsByGame.get(row.game_id) ?? []),
      row.role_id,
    ]);
  }

  const mappingByGame = new Map(
    (
      (mappings.data ?? []) as {
        game_id: number;
        in_game_name: string | null;
        region: string | null;
        rank_id: number | null;
      }[]
    ).map((row) => [row.game_id, row]),
  );

  return catalog.flatMap((game) => {
    const mapping = mappingByGame.get(game.id);
    if (!mapping) return [];
    const roleIds = roleIdsByGame.get(game.id) ?? [];
    return [
      {
        gameSlug: game.slug,
        gameName: game.name,
        inGameName: mapping.in_game_name ?? "",
        region: regionLabel(game.slug, mapping.region),
        regionValue: mapping.region ?? "",
        rank: game.ranks.find((rank) => rank.id === mapping.rank_id)?.name ?? "",
        roles: game.roles
          .filter((role) => roleIds.includes(role.id))
          .map((role) => role.name),
      },
    ];
  });
}
