import type { Metadata } from "next";
import RecentTeammatesPanel, {
  type RecentTeammate,
} from "@/components/social/RecentTeammatesPanel";
import { createClient, getUserId } from "@/lib/supabase/server";
import { fetchGameCatalog } from "@/lib/games";
import { fetchPlayerMatches } from "@/lib/matches";
import { fetchFriends } from "@/lib/social";

export const metadata: Metadata = {
  title: "Recent Teammates — TemanGame",
  description: "Players you've recently matched with in LFG lobbies.",
};

/** How many people the page lists, newest match first. */
const LIMIT = 30;

/**
 * Everyone the player has finished a lobby with (`player_matches`, the same
 * source as their match history), newest first, each person once, without
 * the people they're already friends with.
 */
export default async function RecentTeammatesPage() {
  const supabase = await createClient();
  const [catalog, userId] = await Promise.all([fetchGameCatalog(supabase), getUserId()]);
  if (!userId) return <RecentTeammatesPanel teammates={[]} signedIn={false} />;

  const [matches, friends] = await Promise.all([
    fetchPlayerMatches(supabase, catalog, userId, userId),
    fetchFriends(supabase, userId),
  ]);
  const friendIds = new Set(friends.map((friend) => friend.id));

  const seen = new Set<string>();
  const teammates: RecentTeammate[] = [];
  for (const match of matches) {
    for (const mate of match.teammates) {
      if (seen.has(mate.id) || friendIds.has(mate.id)) continue;
      seen.add(mate.id);
      teammates.push({
        id: mate.id,
        name: mate.name,
        avatar: mate.avatar,
        context: `${match.lobbyName} · ${match.endedAgo}`,
      });
    }
  }

  return <RecentTeammatesPanel teammates={teammates.slice(0, LIMIT)} signedIn />;
}
