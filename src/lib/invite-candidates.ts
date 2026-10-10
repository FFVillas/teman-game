import type { SupabaseClient } from "@supabase/supabase-js";
import { personalityTagOptions, type PersonalityTag } from "@/data/player-profiles";
import { rankIconFor } from "@/data/rank-icons";
import { avatarUrl } from "@/lib/avatar";
import type { GameInfo, GameRank } from "@/lib/games";
import {
  scoreMatch,
  type LobbyCriteria,
  type MatchBreakdown,
} from "@/lib/recommendation";
import { ordinalFits, type RankBounds } from "@/lib/ranks";

/**
 * Players a leader can invite to a real lobby: everyone who set up this game,
 * minus people already involved, read through the same tables the rest of the
 * app uses. Online status and microphone are not here: nothing records them
 * yet, so the real picker simply doesn't offer those filters.
 */
export interface InviteCandidate {
  id: string;
  username: string;
  avatar: string;
  rank: GameRank | undefined;
  rankIcon: string;
  roleNames: string[];
  /** 1 (very casual) to 5 (very competitive); null if they never said. */
  playstyle: number | null;
  /** Average stars; null until anyone has rated them. */
  reputation: number | null;
  reviewCount: number;
  tags: PersonalityTag[];
}

const POOL_LIMIT = 200;

export async function fetchInviteCandidates(
  supabase: SupabaseClient,
  game: GameInfo,
  excludeIds: string[],
): Promise<InviteCandidate[]> {
  const { data: mapping } = await supabase
    .from("user_game_mapping")
    .select("user_id, rank_id")
    .eq("game_id", game.id)
    .limit(POOL_LIMIT + excludeIds.length);

  const excluded = new Set(excludeIds);
  const pool = ((mapping ?? []) as Array<{ user_id: string; rank_id: number | null }>)
    .filter((row) => !excluded.has(row.user_id))
    .slice(0, POOL_LIMIT);
  if (pool.length === 0) return [];
  const ids = pool.map((row) => row.user_id);

  const [{ data: profileRows }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_path, playstyle, personality_tags, reputation_score, review_count")
      .in("id", ids),
    game.roles.length > 0
      ? supabase
          .from("user_game_roles")
          .select("user_id, role_id")
          .eq("game_id", game.id)
          .in("user_id", ids)
      : Promise.resolve({ data: [] as Array<{ user_id: string; role_id: number }> }),
  ]);

  const profiles = new Map(
    (
      (profileRows ?? []) as Array<{
        id: string;
        username: string;
        avatar_path: string | null;
        playstyle: number | null;
        personality_tags: string[];
        reputation_score: number | string;
        review_count: number;
      }>
    ).map((profile) => [profile.id, profile]),
  );
  const rolesOf = new Map<string, string[]>();
  for (const row of (roleRows ?? []) as Array<{ user_id: string; role_id: number }>) {
    const name = game.roles.find((role) => role.id === row.role_id)?.name;
    if (name) rolesOf.set(row.user_id, [...(rolesOf.get(row.user_id) ?? []), name]);
  }

  return pool.flatMap((row): InviteCandidate[] => {
    const profile = profiles.get(row.user_id);
    if (!profile) return [];
    const rank = game.ranks.find((entry) => entry.id === row.rank_id);
    return [
      {
        id: profile.id,
        username: profile.username,
        avatar: avatarUrl(profile.avatar_path),
        rank,
        rankIcon: rank ? (rankIconFor(game.slug, rank) ?? "") : "",
        roleNames: rolesOf.get(profile.id) ?? [],
        playstyle: profile.playstyle,
        reputation: profile.review_count > 0 ? Number(profile.reputation_score) : null,
        reviewCount: profile.review_count,
        tags: profile.personality_tags.filter((tag): tag is PersonalityTag =>
          (personalityTagOptions as readonly string[]).includes(tag),
        ),
      },
    ];
  });
}

export interface ScoredCandidate {
  candidate: InviteCandidate;
  score: MatchBreakdown;
}

/**
 * Hard filter first, then S_total (Persamaan 3.1–3.5), exactly like the mock
 * picker. The criteria a real lobby has are thinner than the mock one's: it
 * carries no playstyle or wanted tags of its own, so the leader's playstyle
 * stands in and tags are left open (full marks on T). An unrated player scores
 * R = 0 rather than being guessed at, and an unranked one is compared as if
 * they were the leader's rank.
 */
export function rankCandidates(
  candidates: InviteCandidate[],
  criteria: LobbyCriteria,
  bounds: RankBounds,
): ScoredCandidate[] {
  return candidates
    .filter((candidate) => ordinalFits(candidate.rank?.ordinal ?? null, bounds))
    .map((candidate) => ({
      candidate,
      score: scoreMatch(
        {
          playstyle: candidate.playstyle ?? criteria.playstyle,
          reputation: candidate.reputation ?? 0,
          tags: candidate.tags,
          rankOrdinal: candidate.rank?.ordinal ?? criteria.rankOrdinal,
        },
        criteria,
      ),
    }));
}
