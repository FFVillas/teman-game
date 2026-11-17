import { cache } from "react";
import { matchesForSlug, type MatchRecord } from "@/data/match-history";
import { resolveProfile } from "@/data/profile-lookup";
import type { PlayerProfile } from "@/data/player-profiles";
import { createClient, getUserId } from "@/lib/supabase/server";
import { fetchProfileByUsername, profileFromRow } from "@/lib/profiles";
import { fetchGameCatalog, fetchPlayerGames } from "@/lib/games";
import { fetchPlayerMatches } from "@/lib/matches";

/**
 * Resolves `/profile/<username>` for a Server Component: a real player first,
 * then the mock directory. The fallback keeps the social/LFG mock rows (which
 * link to slugs like "yonziii") from 404ing until those screens read from the
 * database too; it goes away then.
 *
 * Wrapped in `cache()` so `generateMetadata` and the page itself, which both
 * need the profile for one request, share a single database round trip.
 */
export const loadProfile = cache(
  async (username: string): Promise<PlayerProfile | undefined> => {
    const supabase = await createClient();
    const row = await fetchProfileByUsername(supabase, username);

    if (row) {
      const [viewerId, gameSetups] = await Promise.all([
        getUserId(),
        fetchPlayerGames(supabase, row.id),
      ]);
      return profileFromRow(row, { isOwner: viewerId === row.id, gameSetups });
    }

    return resolveProfile(username);
  },
);

/** A profile's completed lobbies: real ones for real players, mock otherwise. */
export const loadMatches = cache(
  async (profile: PlayerProfile): Promise<MatchRecord[]> => {
    if (!profile.userId) return matchesForSlug(profile.slug);
    const supabase = await createClient();
    const [catalog, viewerId] = await Promise.all([fetchGameCatalog(supabase), getUserId()]);
    return fetchPlayerMatches(supabase, catalog, profile.userId, viewerId);
  },
);
