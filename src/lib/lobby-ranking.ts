import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LfgTeam } from "@/data/lfg-teams";
import type { PersonalityTag } from "@/data/player-profiles";
import type { GameInfo } from "@/lib/games";
import { fetchLobbyTeams } from "@/lib/lobbies";
import { boundsAcceptTier, ordinalFits, teamJoinBounds, tiersOf } from "@/lib/ranks";
import {
  lobbyReputation,
  playstyleScore,
  reputationScore,
  tagScore,
  totalScore,
} from "@/lib/recommendation";
import {
  ANY_RANK,
  FITS_MY_RANK,
  type LobbyFilters,
  type LobbySort,
} from "@/lib/lobby-filters";
import { fetchTagCatalog, fetchTagStrengths } from "@/lib/tags";

/**
 * The LFG list as the proposal describes it (3.3.1.2): hard filters first
 * (game, then the rank range the lobby accepts), the optional filters the
 * player picked (role, region, mode, text), then lobbies ordered by S_total
 * for this player. Runs on the server; the browser only receives the order,
 * never the scores (players see the ranking, not the numbers behind it).
 */

/** The five tags, read once per request however many callers need them. */
const tagCatalog = cache(fetchTagCatalog);

/** What the score needs to know about the player looking at the list. */
export interface Viewer {
  /** Pa in Persamaan 3.2. Null for accounts that never set one (staff). */
  playstyle: number | null;
  rankOrdinal: number | null;
  rankName: string;
  /** s_t (Persamaan 3.13) for each tag the player carries. */
  tagStrength: Map<PersonalityTag, number>;
}

export async function fetchViewer(
  supabase: SupabaseClient,
  game: GameInfo,
  userId: string,
): Promise<Viewer> {
  const [{ data: profile }, { data: mapping }, strengths, catalog] = await Promise.all([
    supabase.from("profiles").select("playstyle").eq("id", userId).maybeSingle(),
    supabase
      .from("user_game_mapping")
      .select("rank_id")
      .eq("user_id", userId)
      .eq("game_id", game.id)
      .maybeSingle(),
    fetchTagStrengths(supabase, [userId]),
    tagCatalog(supabase),
  ]);

  const rank = game.ranks.find((entry) => entry.id === mapping?.rank_id);
  const nameOf = new Map(catalog.map((tag) => [tag.id, tag.name]));
  const tagStrength = new Map<PersonalityTag, number>();
  for (const [tagId, value] of strengths.get(userId) ?? []) {
    const name = nameOf.get(tagId);
    if (name) tagStrength.set(name, value);
  }

  return {
    playstyle: (profile?.playstyle as number | null | undefined) ?? null,
    rankOrdinal: rank?.ordinal ?? null,
    rankName: rank?.name ?? "",
    tagStrength,
  };
}

function matchesText(team: LfgTeam, query: string): boolean {
  const needle = query.toLowerCase();
  return [team.name, team.bio ?? "", team.leaderName].some((text) =>
    text.toLowerCase().includes(needle),
  );
}

export function filterLobbies(
  teams: LfgTeam[],
  filters: LobbyFilters,
  game: GameInfo,
  viewer: Viewer | null,
): LfgTeam[] {
  const tiers = tiersOf(game.ranks);

  return teams.filter((team) => {
    if (filters.query && !matchesText(team, filters.query)) return false;
    if (filters.region && team.region !== filters.region) return false;
    if (filters.mode && team.modeValue !== filters.mode) return false;
    if (
      filters.role &&
      team.lookingFor.length > 0 &&
      !team.lookingFor.some((role) => role.name === filters.role)
    ) {
      return false;
    }

    if (filters.rank === ANY_RANK) return true;
    const bounds = teamJoinBounds(team, game);
    // An unranked or signed-out viewer passes "Fits my rank": the game decides
    // at queue time, and hiding every lobby from them helps nobody.
    return filters.rank === FITS_MY_RANK
      ? ordinalFits(viewer?.rankOrdinal ?? null, bounds)
      : boundsAcceptTier(tiers, bounds, filters.rank);
  });
}

/** A neutral Pb for a lobby whose leader never said how they play. */
const NEUTRAL_PLAYSTYLE = 3;

/**
 * S_total for one lobby, seen from the applicant's side (Persamaan 3.1–3.4,
 * 3.13–3.15). Null when the viewer has no playstyle to compare.
 */
export function scoreLobby(
  team: LfgTeam,
  viewer: Viewer,
  tagNames: ReadonlyMap<number, PersonalityTag>,
): number | null {
  if (viewer.playstyle === null) return null;

  const P = playstyleScore(
    viewer.playstyle,
    team.playstyle ?? team.leaderPlaystyle ?? NEUTRAL_PLAYSTYLE,
  );
  const R = lobbyReputation((team.memberReputations ?? []).map(reputationScore));

  const wanted = (team.wantedTagIds ?? [])
    .map((id) => tagNames.get(id))
    .filter((name): name is PersonalityTag => name !== undefined);
  const T =
    wanted.length === 0
      ? null
      : tagScore([...viewer.tagStrength.keys()], wanted, (tag) =>
          viewer.tagStrength.get(tag) ?? 0,
        );

  return totalScore(P, R, T);
}

const openSlots = (team: LfgTeam) => team.slotsTotal - team.slotsFilled;

/**
 * Orders lobbies that arrive newest first. Array sort is stable, so ties keep
 * that order: equal scores show the newer lobby first.
 */
export function sortLobbies(
  teams: LfgTeam[],
  sort: LobbySort,
  scoreOf: (team: LfgTeam) => number | null,
): LfgTeam[] {
  switch (sort) {
    case "latest":
      return teams;
    case "players":
      return [...teams].sort((a, b) => b.slotsFilled - a.slotsFilled);
    case "open-slots":
      return [...teams].sort((a, b) => openSlots(b) - openSlots(a));
    case "recommended":
      return [...teams].sort((a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1));
  }
}

export interface RecommendedLobbies {
  lobbies: LfgTeam[];
  viewer: Viewer | null;
}

/** The whole pipeline for one game's LFG list. */
export async function recommendLobbies(
  supabase: SupabaseClient,
  game: GameInfo,
  userId: string | null,
  filters: LobbyFilters,
): Promise<RecommendedLobbies> {
  const [teams, viewer, catalog] = await Promise.all([
    fetchLobbyTeams(supabase, game, { viewerId: userId }),
    userId ? fetchViewer(supabase, game, userId) : null,
    tagCatalog(supabase),
  ]);

  const tagNames = new Map(catalog.map((tag) => [tag.id, tag.name]));
  const scores = new Map(
    teams.map((team) => [team.id, viewer ? scoreLobby(team, viewer, tagNames) : null]),
  );

  const visible = filterLobbies(teams, filters, game, viewer);
  return {
    lobbies: sortLobbies(visible, filters.sort, (team) => scores.get(team.id) ?? null),
    viewer,
  };
}
