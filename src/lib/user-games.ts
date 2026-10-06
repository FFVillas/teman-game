import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The games on a player's profile — `user_game_mapping`, `user_game_roles`
 * and the `games` / `game_ranks` / `game_roles` catalogue.
 *
 * The catalogue is the database's, not the app's: every title's full rank
 * ladder lives in `game_ranks` with an `ordinal`, which is exactly what the
 * rank-distance penalty `M_rank` (Persamaan 3.5) needs, and `game_roles`
 * holds each game's role vocabulary. Nothing here is hardcoded in the app,
 * so adding a game or a season's ranks is a database change only.
 *
 * Rank and role are what the player picked — there's no Riot/Moonton API,
 * so nothing is verified and the UI never implies it is.
 */

export interface GameRank {
  id: number;
  name: string;
  ordinal: number;
}

export interface GameRole {
  id: number;
  name: string;
}

export interface CatalogueGame {
  id: number;
  slug: string;
  name: string;
  ranks: GameRank[];
  roles: GameRole[];
}

export interface UserGame {
  gameId: number;
  slug: string;
  name: string;
  inGameName: string;
  region: string;
  /** `game_ranks.id`, or null when they haven't picked one. */
  rankId: number | null;
  rankName: string;
  /** From `game_ranks.ordinal` — the ΔR input for the matching score. */
  rankOrdinal: number | null;
  roleIds: number[];
  roleNames: string[];
}

/**
 * Every game with its ranks and roles, ordered the way they should appear.
 * Returns [] if the query fails so a profile still renders.
 */
export async function fetchGameCatalogue(
  supabase: SupabaseClient,
): Promise<CatalogueGame[]> {
  const [games, ranks, roles] = await Promise.all([
    supabase.from("games").select("id, slug, name").order("sort_order"),
    supabase.from("game_ranks").select("id, game_id, name, ordinal").order("ordinal"),
    supabase.from("game_roles").select("id, game_id, name").order("id"),
  ]);

  if (games.error || !games.data) return [];

  return games.data.map((game) => ({
    id: game.id as number,
    slug: game.slug as string,
    name: game.name as string,
    ranks: (ranks.data ?? [])
      .filter((rank) => rank.game_id === game.id)
      .map((rank) => ({
        id: rank.id as number,
        name: rank.name as string,
        ordinal: rank.ordinal as number,
      })),
    roles: (roles.data ?? [])
      .filter((role) => role.game_id === game.id)
      .map((role) => ({ id: role.id as number, name: role.name as string })),
  }));
}

interface MappingRow {
  game_id: number;
  in_game_name: string | null;
  region: string | null;
  rank_id: number | null;
  games: { slug: string; name: string } | null;
  game_ranks: { name: string; ordinal: number } | null;
}

/**
 * A player's games, in catalogue order so the profile tabs don't reshuffle.
 * Roles come from the join table in a second query — PostgREST can't embed
 * two levels deep through a composite key here.
 */
export async function fetchUserGames(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserGame[]> {
  const [mappings, roles] = await Promise.all([
    supabase
      .from("user_game_mapping")
      .select(
        "game_id, in_game_name, region, rank_id, games (slug, name), game_ranks (name, ordinal)",
      )
      .eq("user_id", userId)
      .order("game_id"),
    supabase
      .from("user_game_roles")
      .select("game_id, role_id, game_roles (name)")
      .eq("user_id", userId),
  ]);

  if (mappings.error || !mappings.data) return [];

  return (mappings.data as unknown as MappingRow[])
    .filter((row) => row.games)
    .map((row) => {
      const mine = (roles.data ?? []).filter(
        (role) => role.game_id === row.game_id,
      );
      return {
        gameId: row.game_id,
        slug: row.games!.slug,
        name: row.games!.name,
        inGameName: row.in_game_name ?? "",
        region: row.region ?? "",
        rankId: row.rank_id,
        rankName: row.game_ranks?.name ?? "",
        rankOrdinal: row.game_ranks?.ordinal ?? null,
        roleIds: mine.map((role) => role.role_id as number),
        roleNames: mine.map(
          (role) =>
            (role.game_roles as unknown as { name: string } | null)?.name ?? "",
        ),
      };
    });
}

/**
 * Saves the edited set: games added, changed and removed, plus each game's
 * roles in the join table.
 *
 * Deliberately not `.upsert()` — see the note in AGENTS.md. Column-level
 * grants make PostgREST's `on conflict do update` fail with 42501 even when
 * nothing conflicts, so inserts and updates are issued separately.
 */
export async function saveUserGames(
  supabase: SupabaseClient,
  userId: string,
  next: UserGame[],
  previous: UserGame[],
): Promise<string | null> {
  const failed = "Couldn't save your games. Try again.";
  const before = new Map(previous.map((game) => [game.gameId, game]));
  const keep = new Set(next.map((game) => game.gameId));

  const removed = previous
    .filter((game) => !keep.has(game.gameId))
    .map((game) => game.gameId);

  if (removed.length > 0) {
    // Roles first: they reference the mapping's game for this user.
    const roleDelete = await supabase
      .from("user_game_roles")
      .delete()
      .eq("user_id", userId)
      .in("game_id", removed);
    if (roleDelete.error) return failed;

    const mappingDelete = await supabase
      .from("user_game_mapping")
      .delete()
      .eq("user_id", userId)
      .in("game_id", removed);
    if (mappingDelete.error) return failed;
  }

  for (const game of next) {
    const values = {
      in_game_name: game.inGameName.trim() || null,
      region: game.region || null,
      rank_id: game.rankId,
    };

    const { error } = before.has(game.gameId)
      ? await supabase
          .from("user_game_mapping")
          .update(values)
          .eq("user_id", userId)
          .eq("game_id", game.gameId)
      : await supabase
          .from("user_game_mapping")
          .insert({ user_id: userId, game_id: game.gameId, ...values });
    if (error) return failed;

    const previousRoles = before.get(game.gameId)?.roleIds ?? [];
    const added = game.roleIds.filter((id) => !previousRoles.includes(id));
    const dropped = previousRoles.filter((id) => !game.roleIds.includes(id));

    if (dropped.length > 0) {
      const { error: dropError } = await supabase
        .from("user_game_roles")
        .delete()
        .eq("user_id", userId)
        .eq("game_id", game.gameId)
        .in("role_id", dropped);
      if (dropError) return failed;
    }

    if (added.length > 0) {
      const { error: addError } = await supabase.from("user_game_roles").insert(
        added.map((roleId) => ({
          user_id: userId,
          game_id: game.gameId,
          role_id: roleId,
        })),
      );
      if (addError) return failed;
    }
  }

  return null;
}

/** A blank entry for a game the player just added. */
export function emptyUserGame(game: CatalogueGame): UserGame {
  return {
    gameId: game.id,
    slug: game.slug,
    name: game.name,
    inGameName: "",
    region: "",
    rankId: null,
    rankName: "",
    rankOrdinal: null,
    roleIds: [],
    roleNames: [],
  };
}
