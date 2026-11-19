import { cache } from "react";
import type { MatchRecord } from "@/data/match-history";
import type { PlayerProfile } from "@/data/player-profiles";
import { createClient, getUserId } from "@/lib/supabase/server";
import { fetchProfileByUsername, fetchSanctionHistory, profileFromRow } from "@/lib/profiles";
import { fetchGameCatalog, fetchPlayerGames } from "@/lib/games";
import { fetchPlayerMatches } from "@/lib/matches";

/**
 * Resolves `/profile/<username>` for a Server Component: the real player, or
 * undefined (the page then 404s). There is no mock fallback any more.
 *
 * Wrapped in `cache()` so `generateMetadata` and the page itself, which both
 * need the profile for one request, share a single database round trip.
 */
export const loadProfile = cache(
  async (username: string): Promise<PlayerProfile | undefined> => {
    const supabase = await createClient();
    const row = await fetchProfileByUsername(supabase, username);

    if (row) {
      const [viewerId, gameSetups, sanctions] = await Promise.all([
        getUserId(),
        fetchPlayerGames(supabase, row.id),
        fetchSanctionHistory(supabase, row.id),
      ]);
      return profileFromRow(row, { isOwner: viewerId === row.id, gameSetups, sanctions });
    }

    return undefined;
  },
);

/** A player's completed lobbies. */
export const loadMatches = cache(
  async (profile: PlayerProfile): Promise<MatchRecord[]> => {
    if (!profile.userId) return [];
    const supabase = await createClient();
    const [catalog, viewerId] = await Promise.all([fetchGameCatalog(supabase), getUserId()]);
    return fetchPlayerMatches(supabase, catalog, profile.userId, viewerId);
  },
);
