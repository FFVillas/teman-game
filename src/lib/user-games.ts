import type { SupabaseClient } from "@supabase/supabase-js";
import { gameBySlug } from "@/data/games";

/**
 * A player's profile for one game — `user_game_mapping` joined to `games`.
 *
 * Everything here is self-reported. There's no Riot/Moonton integration, so
 * the UI says "as entered by the player" rather than dressing it up as
 * synced data.
 */
export interface UserGame {
  /** `games.slug`, the id the app uses everywhere. */
  slug: string;
  name: string;
  inGameName: string;
  region: string;
  rank: string;
  roles: string[];
}

interface MappingRow {
  game_id: number;
  in_game_name: string | null;
  region: string | null;
  rank: string | null;
  roles: string[] | null;
  games: { slug: string; name: string } | { slug: string; name: string }[] | null;
}

function rowToUserGame(row: MappingRow): UserGame | null {
  const game = Array.isArray(row.games) ? row.games[0] : row.games;
  if (!game) return null;
  return {
    slug: game.slug,
    name: game.name,
    inGameName: row.in_game_name ?? "",
    region: row.region ?? "",
    rank: row.rank ?? "",
    roles: row.roles ?? [],
  };
}

/**
 * Every game on a player's profile, in catalogue order so the tabs don't
 * reshuffle between visits.
 *
 * Returns [] rather than throwing when the query fails — the most likely
 * failure is the migration not having been run yet, and a profile page that
 * still renders (minus its game tabs) beats one that 500s.
 */
export async function fetchUserGames(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserGame[]> {
  const { data, error } = await supabase
    .from("user_game_mapping")
    .select("game_id, in_game_name, region, rank, roles, games (slug, name)")
    .eq("user_id", userId)
    .order("game_id");

  if (error || !data) return [];
  return (data as MappingRow[])
    .map(rowToUserGame)
    .filter((game): game is UserGame => game !== null);
}

/** Catalogue id for a slug, from the database rather than hardcoded. */
async function gameIds(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  const { data } = await supabase.from("games").select("id, slug");
  return Object.fromEntries(
    (data ?? []).map((row) => [row.slug as string, row.id as number]),
  );
}

/**
 * Saves the edited set of games: updates the ones that stayed, inserts the
 * new ones, deletes the removed ones.
 *
 * Deliberately not `.upsert()`. The table grants UPDATE on the editable
 * columns only (not on the two key columns), and PostgREST compiles an
 * upsert to `on conflict do update set <every column sent>` — which needs
 * UPDATE on the keys and fails with 42501 permission denied. Three explicit
 * statements each stay inside what's granted.
 */
export async function saveUserGames(
  supabase: SupabaseClient,
  userId: string,
  next: UserGame[],
  previous: UserGame[],
): Promise<string | null> {
  const failed = "Couldn't save your games. Try again.";
  const ids = await gameIds(supabase);

  const before = new Set(previous.map((game) => game.slug));
  const after = new Set(next.map((game) => game.slug));

  const removed = previous.filter((game) => !after.has(game.slug));
  if (removed.length > 0) {
    const { error } = await supabase
      .from("user_game_mapping")
      .delete()
      .eq("user_id", userId)
      .in(
        "game_id",
        removed.map((game) => ids[game.slug]).filter(Boolean),
      );
    if (error) return failed;
  }

  for (const game of next) {
    const gameId = ids[game.slug];
    // A slug with no catalogue row can only come from stale client state.
    if (!gameId) continue;

    const values = {
      in_game_name: game.inGameName.trim() || null,
      region: game.region || null,
      rank: game.rank.trim() || null,
      roles: game.roles,
    };

    const { error } = before.has(game.slug)
      ? await supabase
          .from("user_game_mapping")
          .update(values)
          .eq("user_id", userId)
          .eq("game_id", gameId)
      : await supabase
          .from("user_game_mapping")
          .insert({ user_id: userId, game_id: gameId, ...values });

    if (error) return failed;
  }

  return null;
}

/** A blank entry for a game the player just added. */
export function emptyUserGame(slug: string): UserGame {
  return {
    slug,
    name: gameBySlug(slug)?.name ?? slug,
    inGameName: "",
    region: "",
    rank: "",
    roles: [],
  };
}
