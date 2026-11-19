import type { LfgRank } from "./lfg-ranks";
import type { LfgRole } from "./lfg-roles";
import type { LfgMode } from "./lfg-teams";

/**
 * The shape of a completed lobby, as the profile's history section and the
 * match detail screen show it. Real data comes from `lib/matches.ts`; the mock
 * history that used to live here is gone.
 *
 * `reviewed` is the important flag: rating is optional at the end of a lobby
 * (you can Skip), so a teammate you skipped stays reviewable afterwards. The
 * match detail page is where that gets picked back up.
 */

export interface MatchTeammate {
  id: string;
  name: string;
  /** Set when we have a profile on file, so the row can link through. */
  slug?: string;
  avatar: string;
  /** Missing for a real teammate with no rank set in that game. */
  rank?: LfgRank;
  /** Missing for the leader and in games without roles. */
  role?: LfgRole;
  wasLeader: boolean;
  /** Has the viewer already left a review for this teammate? */
  reviewed: boolean;
}

export interface MatchRecord {
  id: string;
  lobbyName: string;
  lobbyType: string;
  game: string;
  cover: string;
  mode: LfgMode;
  region: string;
  /** Absolute timestamp — the detail page shows this. */
  endedOn: string;
  /** Relative, for compact list rows. */
  endedAgo: string;
  duration: string;
  viewerWasLeader: boolean;
  teammates: MatchTeammate[];
  /**
   * Whether ratings are open for this match: false when it ran under 15
   * minutes (the database refuses those). Mock matches leave it out.
   */
  rateable?: boolean;
}

export function pendingReviews(match: MatchRecord): MatchTeammate[] {
  if (match.rateable === false) return [];
  return match.teammates.filter((teammate) => !teammate.reviewed);
}
