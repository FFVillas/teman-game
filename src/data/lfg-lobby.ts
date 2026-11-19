import type { LfgRank } from "./lfg-ranks";
import type { LfgRole } from "./lfg-roles";

/**
 * The lobby a user is currently inside, plus everything the detail screen
 * needs. Shapes mirror the `lobby`, `applications`, `lobby_messages` and
 * `user_game_mapping` entities in the thesis ERD — see docs/thesis-spec.md.
 *
 * Note the proposal calls this a "lobby"; the discovery list calls the same
 * thing a "team" (LfgTeam). Same entity, two names.
 */

/** Lifecycle of a lobby, matching `lobby.status` in the ERD. */
export type LobbyStatus = "forming" | "live" | "completed";

/**
 * How the viewer relates to this lobby. "invited" is a real third state:
 * you can see the lobby because someone asked you in, but you are not a
 * member until you accept.
 */
export type LobbyViewerRole = "leader" | "member" | "invited";

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export interface LobbyMember {
  id: string;
  name: string;
  /** Empty when the player has no picture; an initial is drawn instead. */
  avatar: string;
  rank: LfgRank;
  /** Absent for the leader and for games without roles. */
  role?: LfgRole | null;
  /** Per-lobby, not a global account flag — the leader is whoever created it. */
  isLeader: boolean;
  /** Mock lobbies only: nothing reads a microphone state from the database. */
  micOn?: boolean;
  /** Community rating, 1.0–5.0. Feeds `R` in the compatibility score. Null until rated. */
  reputation: number | null;
  /** Real players: their profile URL segment (their username). */
  profileSlug?: string;
}

export interface LobbyApplication {
  id: string;
  status: ApplicationStatus;
  applicantName: string;
  avatar: string;
  rank: LfgRank;
  role?: LfgRole | null;
  reputation: number | null;
  profileSlug?: string;
  message?: string;
  appliedAgo: string;
  /**
   * S_total from the recommendation engine, 0.00–1.00. Surfacing it here is
   * the point of the algorithm being explainable — the leader can see *why*
   * an applicant is ranked where they are.
   */
  matchScore?: number;
}

export interface LobbyMessage {
  id: string;
  authorId: string;
  authorName: string;
  avatar?: string;
  /** Real players: their profile URL segment (their username). */
  profileSlug?: string;
  body: string;
  sentAt: string;
  /** Lifecycle events rendered inline (member joined, lobby started, …). */
  isSystem?: boolean;
}


/** Positive attributes from the proposal's personality tag set. */
export const reviewTags = [
  "Team Player",
  "Shot Caller",
  "Positive Attitude",
  "Good Comms",
  "Never Surrender",
  "Flex Player",
];

/**
 * The first four mirror the negative behaviours the questionnaire surfaced
 * most often (AFK 89.7%, flaming 70.7%, trolling 62.1%, verbal abuse 58.6%);
 * the rest cover violations an admin still has to be able to action.
 */
export const reportReasons = [
  "AFK / left the game",
  "Flaming / verbal provocation",
  "Trolling / intentional sabotage",
  "Verbal abuse or harassment",
  "Hate speech or discrimination",
  "Cheating / third-party software",
  "Inappropriate profile content",
  "Other",
];

/**
 * Minimum a report form needs to identify who's being reported. Kept looser
 * than LobbyMember so reports can also be filed from a profile or a finished
 * match, not just from inside a live lobby.
 */
export interface ReportTarget {
  id: string;
  name: string;
  avatar: string;
  rank?: LfgRank;
}

/** Everything a moderator needs to action a ticket. Mirrors `reports`. */
export interface ReportSubmission {
  targetId: string;
  reason: string;
  details: string;
  /** Screenshot or clip, uploaded to the private `report-evidence` bucket. */
  evidenceFile?: File;
  evidenceUrl?: string;
  /** Set when the report comes from a known lobby, per `reports.lobby_id`. */
  lobbyId?: string;
}

export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_ACCEPT = "image/png,image/jpeg,video/mp4";
