import type { GameMode, GameRank } from "@/lib/games";

/**
 * Rank ranges and "who may join this lobby" logic. Pure functions, no
 * database: they work on a game's ladder (`game_ranks`, lowest first).
 *
 * Two different questions live here, and they stay separate:
 *  - ELIGIBILITY: may this player join? A yes/no rule built from the lobby's
 *    own range (set by the leader, optional) and the game's party rule
 *    (applied to the people already in the lobby).
 *  - CLOSENESS: who fits best? That is the rank-distance part of the
 *    recommendation score (`M_rank`) and is not in this file.
 *
 * Researched party rules and their confidence: docs/game-reference.md
 * ("Who can play together"). Those rules come from guides, not the games'
 * own support pages, so treat the numbers below as the best current guess.
 */

/** One tier (a group of divisions): "Gold" is Gold 1, 2 and 3. */
export interface RankTier {
  name: string;
  /** Position among the game's tiers, 0 = lowest. */
  index: number;
  firstOrdinal: number;
  lastOrdinal: number;
}

/** Inclusive limits on a rank's `ordinal`. `null` means no limit that side. */
export interface RankBounds {
  min: number | null;
  max: number | null;
}

/** A range picked as tier names. "" means open on that side. */
export interface TierRange {
  from: string;
  to: string;
}

export const OPEN_BOUNDS: RankBounds = { min: null, max: null };

/** Groups a ladder into its tiers, in order. */
export function tiersOf(ranks: GameRank[]): RankTier[] {
  const tiers: RankTier[] = [];
  for (const rank of [...ranks].sort((a, b) => a.ordinal - b.ordinal)) {
    const last = tiers[tiers.length - 1];
    if (last && last.name === rank.tier) {
      last.lastOrdinal = rank.ordinal;
    } else {
      tiers.push({
        name: rank.tier,
        index: tiers.length,
        firstOrdinal: rank.ordinal,
        lastOrdinal: rank.ordinal,
      });
    }
  }
  return tiers;
}

export function tierOfOrdinal(
  tiers: RankTier[],
  ordinal: number,
): RankTier | undefined {
  return tiers.find(
    (tier) => ordinal >= tier.firstOrdinal && ordinal <= tier.lastOrdinal,
  );
}

/**
 * A tier range as ordinal bounds. "From Silver" starts at the lowest Silver
 * division and "to Gold" ends at the highest Gold division, so whole tiers
 * are always included.
 */
export function boundsFromTierRange(
  tiers: RankTier[],
  range: TierRange,
): RankBounds {
  const from = tiers.find((tier) => tier.name === range.from);
  const to = tiers.find((tier) => tier.name === range.to);
  return {
    min: from ? from.firstOrdinal : null,
    max: to ? to.lastOrdinal : null,
  };
}

/** False only when both ends are set and "from" is above "to". */
export function isTierRangeValid(tiers: RankTier[], range: TierRange): boolean {
  const from = tiers.find((tier) => tier.name === range.from);
  const to = tiers.find((tier) => tier.name === range.to);
  return !from || !to || from.index <= to.index;
}

/**
 * Whether a rank fits the bounds. A player with no rank yet (`null`) fits
 * everything: the game decides at queue time, and hiding every lobby from a
 * new player would be worse than showing one they might be turned down for.
 */
export function ordinalFits(
  ordinal: number | null,
  bounds: RankBounds,
): boolean {
  if (ordinal === null) return true;
  if (bounds.min !== null && ordinal < bounds.min) return false;
  if (bounds.max !== null && ordinal > bounds.max) return false;
  return true;
}

/** Both sets of limits at once. The result can be empty (min above max). */
export function intersectBounds(a: RankBounds, b: RankBounds): RankBounds {
  const min =
    a.min === null ? b.min : b.min === null ? a.min : Math.max(a.min, b.min);
  const max =
    a.max === null ? b.max : b.max === null ? a.max : Math.min(a.max, b.max);
  return { min, max };
}

export function isEmptyBounds(bounds: RankBounds): boolean {
  return bounds.min !== null && bounds.max !== null && bounds.min > bounds.max;
}

/**
 * The game's rule for how far apart ranks in one party may be.
 *  - none:  no limit (casual modes, or a rule we don't model)
 *  - tiers: party members at most `maxApart` tiers apart
 *  - steps: party members at most `maxApart` divisions apart
 *  - bands: members must all be inside one band of tiers
 */
export type PartyRule =
  | { kind: "none" }
  | { kind: "tiers"; maxApart: number }
  | { kind: "steps"; maxApart: number }
  | { kind: "bands"; bands: string[][] };

const NO_RULE: PartyRule = { kind: "none" };

/**
 * The party rule for a mode and lobby size, read from the database
 * (`game_modes.party_*`, `game_ranks.party_band`), so the app and the join
 * check in SQL (`lobby_join_bounds`) use the same data. Only ranked modes have
 * one, and Valorant's applies only below five slots.
 *
 * The rules themselves are approximations from guides (see
 * docs/game-reference.md): the game enforces the real one when the party
 * queues, so a slightly loose guess only means a lobby shows up that the game
 * then refuses.
 */
export function partyRuleFor(
  mode: GameMode | undefined,
  capacity: number,
  ranks: GameRank[],
): PartyRule {
  if (!mode || mode.partyRule === "none") return NO_RULE;
  if (mode.partyRuleMaxCapacity !== null && capacity > mode.partyRuleMaxCapacity) {
    return NO_RULE;
  }
  if (mode.partyRule === "tiers" || mode.partyRule === "steps") {
    return { kind: mode.partyRule, maxApart: mode.partyMaxApart ?? 0 };
  }
  // bands: the tier names that share each `party_band`.
  const bands = new Map<number, string[]>();
  for (const rank of ranks) {
    if (rank.partyBand === null) continue;
    const names = bands.get(rank.partyBand) ?? [];
    if (!names.includes(rank.tier)) names.push(rank.tier);
    bands.set(rank.partyBand, names);
  }
  return { kind: "bands", bands: [...bands.values()] };
}

/**
 * Which ranks may still join, given who is already in the lobby. This is the
 * rule that makes a lobby with a Platinum and a Diamond closed to a Gold in
 * Valorant: with members spanning tiers 4–5 and one tier allowed, a newcomer
 * must be in tier 4 or 5 so that nobody ends up two tiers from anybody.
 *
 * With nobody in the lobby, or no rule, everyone may join.
 */
export function joinableBounds(
  rule: PartyRule,
  tiers: RankTier[],
  memberOrdinals: number[],
): RankBounds {
  if (rule.kind === "none" || memberOrdinals.length === 0 || tiers.length === 0) {
    return OPEN_BOUNDS;
  }

  if (rule.kind === "steps") {
    const low = Math.min(...memberOrdinals);
    const high = Math.max(...memberOrdinals);
    return { min: high - rule.maxApart, max: low + rule.maxApart };
  }

  const memberTiers = memberOrdinals
    .map((ordinal) => tierOfOrdinal(tiers, ordinal))
    .filter((tier): tier is RankTier => tier !== undefined);
  if (memberTiers.length === 0) return OPEN_BOUNDS;

  if (rule.kind === "tiers") {
    const low = Math.min(...memberTiers.map((tier) => tier.index));
    const high = Math.max(...memberTiers.map((tier) => tier.index));
    const from = Math.max(0, high - rule.maxApart);
    const to = Math.min(tiers.length - 1, low + rule.maxApart);
    if (from > to) return { min: 1, max: 0 }; // members already too far apart
    return { min: tiers[from].firstOrdinal, max: tiers[to].lastOrdinal };
  }

  // bands: every member must be in one band; the newcomer joins that band.
  const band = rule.bands.find((names) =>
    memberTiers.every((tier) => names.includes(tier.name)),
  );
  if (!band) return { min: 1, max: 0 };
  const inBand = tiers.filter((tier) => band.includes(tier.name));
  if (inBand.length === 0) return OPEN_BOUNDS;
  return {
    min: Math.min(...inBand.map((tier) => tier.firstOrdinal)),
    max: Math.max(...inBand.map((tier) => tier.lastOrdinal)),
  };
}

/**
 * The ranks that may join a lobby, all sources combined: the game's party
 * rule applied to who is already in, and the range the leader set (if any).
 * Open bounds mean anyone.
 */
export function lobbyJoinBounds(
  rule: PartyRule,
  tiers: RankTier[],
  memberOrdinals: number[],
  leaderChosen: RankBounds,
): RankBounds {
  return intersectBounds(joinableBounds(rule, tiers, memberOrdinals), leaderChosen);
}

/**
 * Whether a lobby would accept somebody from this tier: true if at least one
 * division of the tier fits. This is what the LFG "Rank" filter asks ("lobbies
 * that accept Gold"). It is deliberately generous: the filter knows a tier,
 * not the person's exact division, so it never hides a lobby that a Gold 3
 * could join just because a Gold 1 couldn't. An unknown tier name matches
 * everything.
 */
export function boundsAcceptTier(
  tiers: RankTier[],
  bounds: RankBounds,
  tierName: string,
): boolean {
  const tier = tiers.find((candidate) => candidate.name === tierName);
  if (!tier) return true;
  if (isEmptyBounds(bounds)) return false;
  if (bounds.min !== null && tier.lastOrdinal < bounds.min) return false;
  if (bounds.max !== null && tier.firstOrdinal > bounds.max) return false;
  return true;
}

/**
 * Wording for the range a leader chose, straight from the tier names (no
 * ladder needed): "Silver to Gold", "Diamond and up", "Gold and below",
 * "Any rank". Used on lobby cards, where the leader's range is the one thing
 * shown about rank.
 */
export function describeTierRange(range: TierRange | undefined): string {
  if (!range || (!range.from && !range.to)) return "Any rank";
  if (range.from && range.to) {
    return range.from === range.to ? range.from : `${range.from} to ${range.to}`;
  }
  return range.from ? `${range.from} and up` : `${range.to} and below`;
}

/**
 * Plain wording for bounds, e.g. "Silver to Platinum", "Gold and up",
 * "Any rank". Uses the tier names, since divisions are noise here.
 */
export function describeBounds(tiers: RankTier[], bounds: RankBounds): string {
  if (isEmptyBounds(bounds)) return "No one can join";
  const from = bounds.min === null ? undefined : tierOfOrdinal(tiers, bounds.min);
  const to = bounds.max === null ? undefined : tierOfOrdinal(tiers, bounds.max);

  const lowest = tiers[0];
  const highest = tiers[tiers.length - 1];
  const fromIsBottom = !from || (lowest && from.index === lowest.index);
  const toIsTop = !to || (highest && to.index === highest.index);

  if (fromIsBottom && toIsTop) return "Any rank";
  if (fromIsBottom) return `${to!.name} and below`;
  if (toIsTop) return `${from!.name} and up`;
  return from!.index === to!.index
    ? from!.name
    : `${from!.name} to ${to!.name}`;
}

/**
 * The two ends of a tier range as concrete ladder steps, for showing "Plat 1
 * and Diamond 3" style badges: the lowest division of the "from" tier and the
 * highest division of the "to" tier. An end that is empty or unknown comes
 * back undefined, which means open on that side.
 */
export function rankRangeEnds(
  ranks: GameRank[],
  range: TierRange | undefined,
): { from?: GameRank; to?: GameRank } {
  if (!range) return {};
  const sorted = [...ranks].sort((a, b) => a.ordinal - b.ordinal);
  const from = range.from
    ? sorted.find((rank) => rank.tier === range.from)
    : undefined;
  const to = range.to
    ? [...sorted].reverse().find((rank) => rank.tier === range.to)
    : undefined;
  return { from, to };
}
