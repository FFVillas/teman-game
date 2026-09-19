import type { PersonalityTag } from "@/data/player-profiles";

/**
 * The recommendation engine — Persamaan 3.1–3.5 of the proposal, verbatim.
 *
 *   S_total = (0.40·P + 0.30·R + 0.30·T) · M_rank
 *
 *   P      = 1 − |P_a − P_b| / 4          playstyle, 1–5 Likert       (3.2)
 *   R      = avg_stars / 5                 reputation                  (3.3)
 *   T      = |A ∩ B| / |B|, T = 1 if |B|=0 personality tags, |B| ≤ 3   (3.4)
 *   M_rank = max(0.30, 1 − (ΔR/10 × 0.70)) rank-distance penalty       (3.5)
 *
 * Deliberately a transparent weighted sum rather than a learned model: every
 * number can be shown to the leader, which is the thesis argument. Pure
 * functions so this moves server-side (Node) unchanged — the client should
 * eventually just receive the sorted list.
 */

export const SCORE_WEIGHTS = { playstyle: 0.4, reputation: 0.3, tags: 0.3 };
export const RANK_TOLERANCE = 10;
export const RANK_MAX_PENALTY = 0.7;
export const RANK_FLOOR = 0.3;

const LIKERT_SPAN = 4; // 5 − 1
const MAX_STARS = 5;

// ---------------------------------------------------------------------------
// Rank ladder
// ---------------------------------------------------------------------------

/**
 * Valorant's ladder as sub-tier ordinals (Iron 1 = 0 … Immortal 3 = 23,
 * Radiant = 24). ΔR is measured on this scale, so one division = 1 step and
 * a whole tier = 3.
 */
const tiers = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Ascendant",
  "Immortal",
  "Radiant",
];

export function rankOrdinal(tierName: string, division = 1): number {
  const index = tiers.indexOf(tierName);
  if (index < 0) return 0;
  if (tierName === "Radiant") return index * 3; // single division
  return index * 3 + (Math.min(Math.max(division, 1), 3) - 1);
}

export function rankLabel(tierName: string, division = 1): string {
  return tierName === "Radiant" ? tierName : `${tierName} ${division}`;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export function playstyleScore(applicant: number, lobby: number): number {
  return 1 - Math.abs(applicant - lobby) / LIKERT_SPAN;
}

export function reputationScore(avgStars: number): number {
  return Math.min(Math.max(avgStars, 0), MAX_STARS) / MAX_STARS;
}

export function tagScore(
  applicantTags: readonly PersonalityTag[],
  wantedTags: readonly PersonalityTag[]
): number {
  // No criteria means the leader is flexible — full marks, per the proposal.
  if (wantedTags.length === 0) return 1;
  const matched = wantedTags.filter((tag) => applicantTags.includes(tag));
  return matched.length / wantedTags.length;
}

export function rankMultiplier(deltaR: number): number {
  return Math.max(
    RANK_FLOOR,
    1 - (deltaR / RANK_TOLERANCE) * RANK_MAX_PENALTY
  );
}

// ---------------------------------------------------------------------------
// Total
// ---------------------------------------------------------------------------

export interface MatchInput {
  playstyle: number;
  reputation: number;
  tags: readonly PersonalityTag[];
  rankOrdinal: number;
}

export interface LobbyCriteria {
  playstyle: number;
  wantedTags: readonly PersonalityTag[];
  rankOrdinal: number;
}

export interface MatchBreakdown {
  P: number;
  R: number;
  T: number;
  M: number;
  deltaR: number;
  matchedTags: PersonalityTag[];
  /** S_total, 0.00–1.00. */
  total: number;
}

export function scoreMatch(
  player: MatchInput,
  lobby: LobbyCriteria
): MatchBreakdown {
  const P = playstyleScore(player.playstyle, lobby.playstyle);
  const R = reputationScore(player.reputation);
  const T = tagScore(player.tags, lobby.wantedTags);
  const deltaR = Math.abs(player.rankOrdinal - lobby.rankOrdinal);
  const M = rankMultiplier(deltaR);

  const weighted =
    SCORE_WEIGHTS.playstyle * P +
    SCORE_WEIGHTS.reputation * R +
    SCORE_WEIGHTS.tags * T;

  return {
    P,
    R,
    T,
    M,
    deltaR,
    matchedTags: lobby.wantedTags.filter((tag) => player.tags.includes(tag)),
    total: weighted * M,
  };
}

export const playstyleLabels: Record<number, string> = {
  1: "Very casual",
  2: "Casual",
  3: "Balanced",
  4: "Competitive",
  5: "Very competitive",
};
