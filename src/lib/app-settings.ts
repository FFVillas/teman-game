import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Settings that live in the database (`app_setting`,
 * 20261128000000_min_lobby_minutes.sql) because the database enforces them.
 * The app reads the same row for its wording, so the two can't disagree.
 */

/** Production value, and the fallback when the row can't be read. */
export const DEFAULT_MIN_LOBBY_MINUTES = 15;

const TTL_MS = 60_000;
let cached: { loadedAt: number; minutes: Promise<number> } | null = null;

/**
 * Minutes a lobby must run before its players can rate each other (15 in
 * production, 5 during the user study). Cached for a minute per server
 * instance, so changing it in the SQL editor shows up within a minute.
 */
export function fetchMinLobbyMinutes(supabase: SupabaseClient): Promise<number> {
  if (cached && Date.now() - cached.loadedAt < TTL_MS) return cached.minutes;

  const entry = {
    loadedAt: Date.now(),
    minutes: Promise.resolve(
      supabase
        .from("app_setting")
        .select("value")
        .eq("key", "min_lobby_minutes")
        .maybeSingle(),
    ).then(({ data, error }) => {
      const minutes = Number(data?.value);
      if (error || !Number.isFinite(minutes)) {
        // Not cached: the migration may simply not have run yet.
        if (cached === entry) cached = null;
        return DEFAULT_MIN_LOBBY_MINUTES;
      }
      return minutes;
    }),
  };
  cached = entry;
  return entry.minutes;
}
