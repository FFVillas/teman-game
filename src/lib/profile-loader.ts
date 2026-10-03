import { cache } from "react";
import { resolveProfile } from "@/data/profile-lookup";
import type { PlayerProfile } from "@/data/player-profiles";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileByUsername, profileFromRow } from "@/lib/profiles";

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return profileFromRow(row, { isOwner: user?.id === row.id });
    }

    return resolveProfile(username);
  },
);
