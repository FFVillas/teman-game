import type { PersonalityTag } from "@/data/player-profiles";

/**
 * The recommendation engine — Persamaan 3.1–3.15 of the proposal as revised
 * on 14 October 2026 (see docs/proposal-revision-2026-10.md).
 *
 *   S_total = 0.40·P + 0.28·R + 0.32·T                                 (3.1)
 *   S_total = (0.40·P + 0.28·R) / 0.68   when |B| = 0                  (3.15)
 *
 *   P = 1 − |P_a − P_b| / 4               playstyle, 1–5 Likert        (3.2)
 *   R = (R* − 1) / 4                      reputation, min-max          (3.3)
 *   T = Σ s_t / |B|, t ∈ B                personality tags, |B| ≤ 3    (3.14)
 *
 * **There is no `M_rank` multiplier any more.** Rank is a filter (the
 * leader's accepted range, plus the game's party rule — src/lib/ranks.ts) and
 * nothing else. Multiplying the score by rank distance as well punished
 * candidates the leader had already accepted, and inverted the survey finding
 * the thesis rests on: a perfect social match ten sub-tiers away scored
 * 1.0 × 0.30 = 0.30, losing to a mediocre same-rank candidate on 0.5 × 1.0.
 * Playstyle mattered to 79.3% of respondents, skill to 46.6%.
 *
 * `R` here is already normalised 0–1. Computing `R*` (Bayesian weighted
 * average with rater-bias correction over a 25-rating window, Persamaan
 * 3.5–3.11) belongs in the database and arrives with the `reviews` table;
 * until then callers pass a plain normalised average.
 *
 * Deliberately a transparent weighted sum rather than a learned model: every
 * number can be defended one at a time, which is the thesis argument. Pure
 * functions so this moves server-side unchanged.
 */

/**
 * Persamaan 3.1's weights, counted straight off the questionnaire (Gambar
 * L2.9, n = 99): playstyle was named by 81 respondents, personality fit by
 * 65, positive attitude by 57. Each over the total of 203 gives 0.399, 0.320
 * and 0.281, rounded to the figures below.
 *
 * **They are not 0.40 / 0.30 / 0.30**, which is what this file used to say.
 * The two worked examples in the proposal hide the difference almost
 * completely — the first (P = R = 0.75, no tags) comes out at 0.75 under
 * either set, because a weighted mean of equal values doesn't depend on the
 * weights at all. Only the second separates them: P = R = 0.75 with T = 1 is
 * 0.83 here and 0.825 under the old split, and the proposal prints 0.83.
 *
 * Because the question allowed several answers, these count *how many people
 * called a factor important*, not how important it is. The proposal commits
 * to a sensitivity analysis over ±0.10 on each weight for that reason, so
 * expect to vary them — keep them in one place.
 */
export const SCORE_WEIGHTS = { playstyle: 0.4, reputation: 0.28, tags: 0.32 };

const LIKERT_SPAN = 4; // 5 − 1
/** Lowest and highest star rating, for the min-max normalisation in (3.3). */
const MIN_STARS = 1;
const STAR_SPAN = 4; // 5 − 1

// ---------------------------------------------------------------------------
// Rank ladder
// ---------------------------------------------------------------------------

/**
 * Valorant's ladder as sub-tier ordinals (Iron 1 = 0 … Immortal 3 = 23,
 * Radiant = 24). One division = 1 step, a whole tier = 3.
 *
 * Still needed after `M_rank` was dropped: the ordinals drive the rank-range
 * filter, and `MatchBreakdown.deltaR` backs the picker's "closest rank" sort —
 * an option the leader chooses, not part of `S_total`.
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

/**
 * Persamaan 3.3 — min-max, not `stars / 5`.
 *
 * A rating cannot go below one star, so dividing by 5 left R stuck at 0.20 at
 * worst: a fifth of the range unusable, and R not comparable with P and T,
 * which both span a full 0–1.
 */
export function reputationScore(stars: number): number {
  const clamped = Math.min(Math.max(stars, MIN_STARS), MIN_STARS + STAR_SPAN);
  return (clamped - MIN_STARS) / STAR_SPAN;
}

/**
 * Persamaan 3.14 — how strongly the applicant carries the tags this lobby
 * asked for. Tags the applicant has beyond that don't count against them.
 *
 * `strengthOf` is Persamaan 3.13 (`s_t`), which needs `review_tag` to be
 * meaningful. Until that table exists every self-picked tag has strength 1 and
 * every other tag 0, which reduces this to the old |A ∩ B| / |B|.
 *
 * Callers must not pass an empty `wantedTags` — `scoreMatch` renormalises that
 * case instead (3.15), because scoring it as 1 would hand a lobby that set no
 * criteria a free 0.30.
 */
export function tagScore(
  applicantTags: readonly PersonalityTag[],
  wantedTags: readonly PersonalityTag[],
  strengthOf: (tag: PersonalityTag) => number = (tag) =>
    applicantTags.includes(tag) ? 1 : 0
): number {
  if (wantedTags.length === 0) return 0;
  const sum = wantedTags.reduce((acc, tag) => acc + strengthOf(tag), 0);
  return sum / wantedTags.length;
}

// ---------------------------------------------------------------------------
// Total
// ---------------------------------------------------------------------------

export interface MatchInput {
  playstyle: number;
  reputation: number;
  tags: readonly PersonalityTag[];
  /**
   * Persamaan 3.13, from `tag_strengths()`. Absent means "no data yet", and
   * every tag the player holds then counts as a full 1 — which is also what
   * the database returns for someone nobody has rated.
   */
  tagStrength?: ReadonlyMap<PersonalityTag, number>;
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
  /** `null` when the lobby set no tag criteria — T is then left out of (3.1). */
  T: number | null;
  /** Rank distance. Not part of `total`; backs the picker's own rank sort. */
  deltaR: number;
  matchedTags: PersonalityTag[];
  /** S_total, 0.00–1.00. */
  total: number;
}

/**
 * Persamaan 3.1, or 3.15 when the lobby set no tag criteria (`T` is null).
 *
 * With no criteria, T is dropped and the remaining two weights are rescaled so
 * they still sum to 1 and keep their 10 : 7 ratio — the division by 0.68 the
 * proposal spells out. Scoring the missing T as 1 instead would let a lobby
 * that set no criteria outrank one whose criteria the applicant actually meets.
 */
export function totalScore(P: number, R: number, T: number | null): number {
  const scored = SCORE_WEIGHTS.playstyle * P + SCORE_WEIGHTS.reputation * R;
  if (T === null) {
    return scored / (SCORE_WEIGHTS.playstyle + SCORE_WEIGHTS.reputation);
  }
  return scored + SCORE_WEIGHTS.tags * T;
}

export function scoreMatch(
  player: MatchInput,
  lobby: LobbyCriteria
): MatchBreakdown {
  const P = playstyleScore(player.playstyle, lobby.playstyle);
  const R = reputationScore(player.reputation);
  const deltaR = Math.abs(player.rankOrdinal - lobby.rankOrdinal);

  if (lobby.wantedTags.length === 0) {
    return { P, R, T: null, deltaR, matchedTags: [], total: totalScore(P, R, null) };
  }

  const T = tagScore(player.tags, lobby.wantedTags, (tag) =>
    player.tagStrength
      ? (player.tagStrength.get(tag) ?? 0)
      : player.tags.includes(tag)
        ? 1
        : 0,
  );

  return {
    P,
    R,
    T,
    deltaR,
    matchedTags: lobby.wantedTags.filter((tag) => player.tags.includes(tag)),
    total: totalScore(P, R, T),
  };
}

/**
 * Persamaan 3.4 — a lobby's reputation is the mean of everyone currently in
 * it, the leader included.
 *
 * Used when an *applicant* looks at a list of lobbies; the other direction (a
 * leader looking at applicants) uses the applicant's own R. The thesis calls
 * this a reciprocal recommender: fit has to be judged from both sides.
 *
 * The mean is deliberate — an applicant plays with the whole team, and the
 * behaviour respondents complained about most (AFK, flaming, trolling) can
 * come from any member. It does hide one bad member behind four good ones,
 * which is why the lobby card has to show each member's own reputation.
 *
 * Takes already-normalised values (0–1, via `reputationScore`). An empty
 * lobby can't exist — it always has its leader — so the caller passing an
 * empty list is a bug, and 0 is returned rather than NaN.
 */
export function lobbyReputation(memberScores: readonly number[]): number {
  if (memberScores.length === 0) return 0;
  const total = memberScores.reduce((sum, value) => sum + value, 0);
  return total / memberScores.length;
}

export const playstyleLabels: Record<number, string> = {
  1: "Very casual",
  2: "Casual",
  3: "Balanced",
  4: "Competitive",
  5: "Very competitive",
};
