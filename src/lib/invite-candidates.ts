import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonalityTag } from "@/data/player-profiles";
import { rankIconFor } from "@/data/rank-icons";
import { avatarUrl } from "@/lib/avatar";
import { fetchTagCatalog, fetchTagStrengths } from "@/lib/tags";
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
  /** Average stars, as the profile shows it; null until anyone has rated them. */
  reputation: number | null;
  reviewCount: number;
  /** Different players who rated them: the number shown beside the stars. */
  raterCount: number;
  /** R* (Persamaan 3.10), what the score uses; 3 for a player nobody rated. */
  rstar: number;
  /** The tags the player picked, exactly as their profile shows them. */
  tags: PersonalityTag[];
  /**
   * Persamaan 3.13 per tag, 0.00-1.00: the picked tags *and* the ones raters
   * gave them. Scored with, never listed, so the picker shows the same three
   * tags the profile does.
   */
  tagStrength: Map<PersonalityTag, number>;
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

  const [{ data: profileRows }, { data: roleRows }, strengthsOf, catalog] =
    await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, username, avatar_path, playstyle, reputation_score, reputation_bayes, review_count, rater_count, is_suspended, user_tag (tag_id)",
      )
      .in("id", ids)
      // Proposal: a suspended player is left out before anything is scored.
      .eq("is_suspended", false),
    game.roles.length > 0
      ? supabase
          .from("user_game_roles")
          .select("user_id, role_id")
          .eq("game_id", game.id)
          .in("user_id", ids)
      : Promise.resolve({ data: [] as Array<{ user_id: string; role_id: number }> }),
    fetchTagStrengths(supabase, ids),
    fetchTagCatalog(supabase),
  ]);

  // tag_strengths() keys by tag id; the scoring works in tag names.
  const nameOfTag = new Map(catalog.map((entry) => [entry.id, entry.name]));

  const profiles = new Map(
    (
      (profileRows ?? []) as Array<{
        id: string;
        username: string;
        avatar_path: string | null;
        playstyle: number | null;
        reputation_score: number | string;
        reputation_bayes: number | string | null;
        review_count: number;
        rater_count: number;
        user_tag: { tag_id: number }[] | null;
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
        raterCount: profile.rater_count,
        rstar: Number(profile.reputation_bayes ?? 3),
        tags: (profile.user_tag ?? [])
          .map((entry) => nameOfTag.get(entry.tag_id))
          .filter((name): name is PersonalityTag => Boolean(name)),
        // From tag_strengths(): the picked tags *and* the ones raters gave,
        // the union Persamaan 3.13 normalises over.
        tagStrength: new Map(
          [...(strengthsOf.get(profile.id)?.entries() ?? [])].flatMap(
            ([tagId, value]) => {
              const name = nameOfTag.get(tagId);
              return name ? [[name, value] as const] : [];
            },
          ),
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
 * Hard filter first, then S_total (Persamaan 3.1–3.5) from the leader's side,
 * the same way the join-request list is ordered (lib/lobbies.ts): Pb is the
 * lobby's playstyle (the leader's while it has none), T is the candidate's
 * strength in the tags the lobby wants (3.15 when it wants none), and R is
 * the candidate's own R* — 3 for a player nobody has rated, the prior of
 * Persamaan 3.10, so a new player is neither rewarded nor punished. An
 * unranked candidate is compared as if they were the leader's rank.
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
          reputation: candidate.rstar,
          tags: candidate.tags,
          tagStrength: candidate.tagStrength,
          rankOrdinal: candidate.rank?.ordinal ?? criteria.rankOrdinal,
        },
        criteria,
      ),
    }));
}
