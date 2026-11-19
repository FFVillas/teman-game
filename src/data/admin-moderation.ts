import type { LfgRank } from "./lfg-ranks";
import type { LfgMode } from "./lfg-teams";
import { reportReasons, type LobbyMessage, type LobbyStatus } from "./lfg-lobby";

/**
 * Everything the admin console reads and writes. Shapes mirror the tables
 * the console needs — see docs/admin-console.md:
 *
 *   user        → AdminPlayer   (account status is *derived* from sanctions)
 *   lobby       → AdminLobby
 *   reports     → AdminReport   (+ status / resolution columns)
 *   sanctions   → Sanction      (new table, not in the original 13-entity ERD)
 *   admin_actions → AdminAction (new table — the audit log)
 *
 * The data itself comes from Supabase (`lib/admin-data.ts`); the demo seed
 * that used to live here is gone.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountStatus = "active" | "warned" | "suspended";

export type ReportStatus = "pending" | "in_review" | "resolved" | "rejected";

/** Where the reporter was when they filed it. */
export type ReportSource = "lobby" | "profile" | "match";

export type ReportSeverity = "high" | "normal";

/**
 * Only two, per the October 2026 proposal revision: a warning, or a
 * suspension with a start and an end. A permanent ban has no duration, so the
 * thesis' `sanction` table cannot express one. Reputation is never adjusted by
 * a moderator either — it moves only through player ratings.
 */
export type SanctionType = "warning" | "suspension";

export type AdminLobbyStatus = LobbyStatus | "closed";

export interface AdminPlayer {
  id: string;
  username: string;
  avatar: string;
  email: string;
  region: string;
  joinedAt: string;
  lastActiveAt: string;
  /** Average stars, or null before their first review. */
  reputation: number | null;
  reviewCount: number;
  rank?: LfgRank;
  mainGame: string;
}

export interface ReportResolution {
  outcome: "sanctioned" | "rejected";
  sanctionId?: string;
  note: string;
  resolvedBy: string;
  resolvedAt: string;
}

export interface AdminReport {
  id: string;
  status: ReportStatus;
  reason: string;
  details: string;
  evidenceFileName?: string;
  reporterId: string;
  targetId: string;
  source: ReportSource;
  lobbyId?: string;
  createdAt: string;
  /** The admin who claimed it — stops two moderators working one case. */
  assignedTo?: string;
  resolution?: ReportResolution;
}

export interface Sanction {
  id: string;
  playerId: string;
  type: SanctionType;
  /** Suspensions only. */
  durationDays?: number;
  reason: string;
  /** Internal note. Never shown to the player. */
  note: string;
  reportIds: string[];
  issuedBy: string;
  issuedAt: string;
  expiresAt?: string;
  liftedAt?: string;
  liftedBy?: string;
  liftReason?: string;
}

export interface AdminLobby {
  id: string;
  name: string;
  game: string;
  cover: string;
  mode: LfgMode;
  status: AdminLobbyStatus;
  region: string;
  leaderId: string;
  memberIds: string[];
  slotsTotal: number;
  createdAt: string;
  closedAt?: string;
  closedBy?: string;
  closedReason?: string;
  messages: LobbyMessage[];
}

export type AdminActionType =
  | "report_claimed"
  | "report_dismissed"
  | "sanction_issued"
  | "sanction_lifted"
  | "lobby_closed"
  | "member_removed";

export interface AdminAction {
  id: string;
  adminId: string;
  type: AdminActionType;
  targetType: "player" | "lobby" | "report";
  targetId: string;
  /** Human-readable summary, e.g. "7-day suspension". */
  summary: string;
  reason: string;
  at: string;
}

/**
 * A 1–2 star rating's reason (proposal: "catatan untuk keperluan moderasi").
 * Never names the rater: ratings stay anonymous, to staff as well.
 */
export interface LowRating {
  playerId: string;
  stars: number;
  /** afk, flaming, trolling, verbal_abuse */
  reason: string;
  lobbyId: string;
  at: string;
}

export interface AdminData {
  players: AdminPlayer[];
  reports: AdminReport[];
  sanctions: Sanction[];
  lobbies: AdminLobby[];
  actions: AdminAction[];
  lowRatings: LowRating[];
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

/**
 * Triage order. Harm to other people and cheating jump the queue; the rest
 * are worked oldest-first.
 */
const highSeverityReasons = new Set([
  "Hate speech or discrimination",
  "Verbal abuse or harassment",
  "Cheating / third-party software",
]);

export function reasonSeverity(reason: string): ReportSeverity {
  return highSeverityReasons.has(reason) ? "high" : "normal";
}

export { reportReasons };

/** A warning keeps an account "warned" for this long. */
export const WARNING_WINDOW_DAYS = 90;

export const suspensionDurations = [1, 3, 7, 30] as const;

export const sanctionLabels: Record<SanctionType, string> = {
  warning: "Warning",
  suspension: "Suspension",
};

export const MIN_ADMIN_NOTE_LENGTH = 10;
