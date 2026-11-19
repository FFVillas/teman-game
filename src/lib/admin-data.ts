import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminAction,
  AdminActionType,
  AdminData,
  AdminLobby,
  AdminLobbyStatus,
  AdminPlayer,
  AdminReport,
  LowRating,
  Sanction,
  SanctionType,
} from "@/data/admin-moderation";
import type { LobbyMessage } from "@/data/lfg-lobby";
import { coverSrc } from "@/data/lfg-covers";
import { rankIconFor } from "@/data/rank-icons";
import { avatarUrl } from "@/lib/avatar";
import { fetchGameCatalog, type GameInfo } from "@/lib/games";
import { setStaffNames } from "@/data/admin-accounts";

/**
 * The admin console's reads and writes against the real database. Reads load
 * everything the console shows in one go (fine at this platform's size: a few
 * hundred lobbies and reports), shaped like the mock data the screens were
 * built on. Every write is a moderation function from
 * `20261119000200_admin_moderation.sql`, which checks the caller is an admin,
 * requires a reason and writes the audit entry itself.
 */

const LOBBY_LIMIT = 300;

interface ProfileRow {
  id: string;
  username: string;
  avatar_path: string | null;
  reputation_score: number | null;
  review_count: number | null;
  user_game_mapping: { game_id: number; rank_id: number | null; region: string | null }[];
}

interface ReportRow {
  id: string;
  reporter_id: string;
  target_id: string;
  lobby_id: string | null;
  reason: string;
  details: string | null;
  evidence_path: string | null;
  evidence_url: string | null;
  status: AdminReport["status"];
  assigned_to: string | null;
  resolution_outcome: string | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  sanction_id: string | null;
  created_at: string;
}

interface SanctionRow {
  id: string;
  player_id: string;
  type: SanctionType;
  duration_days: number | null;
  reason: string;
  note: string | null;
  issued_by: string;
  issued_at: string;
  expires_at: string | null;
  lifted_at: string | null;
  lifted_by: string | null;
  lift_reason: string | null;
  sanction_reports: { report_id: string }[];
}

interface LobbyRow {
  id: string;
  name: string;
  game_id: number;
  mode_id: number | null;
  cover: string | null;
  status: string;
  region: string | null;
  leader_id: string;
  capacity: number;
  created_at: string;
  closed_at: string | null;
}

interface MessageRow {
  id: string;
  lobby_id: string;
  sender_id: string | null;
  kind: "message" | "system";
  body: string;
  created_at: string;
}

interface ActionRow {
  id: string;
  admin_id: string;
  type: string;
  target_type: AdminAction["targetType"];
  target_id: string;
  summary: string;
  reason: string;
  created_at: string;
}

/** The database's lobby states, in the console's words. */
function lobbyStatus(status: string): AdminLobbyStatus {
  if (status === "in_progress") return "live";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "closed";
  return "forming"; // open, scheduled
}

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** The file name from a `report-evidence` path, for the case page. */
function evidenceName(path: string | null, url: string | null): string | undefined {
  const value = path ?? url;
  return value ? value.split("/").pop() : undefined;
}

function toPlayer(
  row: ProfileRow,
  account: { email: string; joined_at: string; last_sign_in_at: string | null } | undefined,
  catalog: GameInfo[],
): AdminPlayer {
  const first = row.user_game_mapping[0];
  const game = first ? catalog.find((g) => g.id === first.game_id) : undefined;
  const rank = game?.ranks.find((r) => r.id === first?.rank_id);
  return {
    id: row.id,
    username: row.username,
    avatar: avatarUrl(row.avatar_path),
    email: account?.email ?? "",
    region: first?.region ?? "—",
    joinedAt: account?.joined_at ?? "",
    lastActiveAt: account?.last_sign_in_at ?? account?.joined_at ?? "",
    reputation: row.review_count ? Number(row.reputation_score) : null,
    reviewCount: row.review_count ?? 0,
    rank:
      rank && game
        ? { name: rank.name, icon: rankIconFor(game.slug, rank) ?? "", colorClass: "text-white/90" }
        : undefined,
    mainGame: game?.name ?? "—",
  };
}

export async function fetchAdminData(supabase: SupabaseClient): Promise<AdminData> {
  const [catalog, profiles, staff, accounts, reports, sanctions, lobbies, actions, lowRatings] =
    await Promise.all([
      fetchGameCatalog(supabase),
      supabase
        .from("profiles")
        .select(
          "id, username, avatar_path, reputation_score, review_count, user_game_mapping(game_id, rank_id, region)",
        ),
      supabase.from("admins").select("user_id, display_name"),
      supabase.rpc("admin_accounts"),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      supabase
        .from("sanction")
        .select("*, sanction_reports(report_id)")
        .order("issued_at", { ascending: false }),
      supabase
        .from("lobby")
        .select(
          "id, name, game_id, mode_id, cover, status, region, leader_id, capacity, created_at, closed_at",
        )
        .order("created_at", { ascending: false })
        .limit(LOBBY_LIMIT),
      supabase
        .from("admin_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.rpc("admin_low_ratings"),
    ]);

  const firstError = [profiles, staff, accounts, reports, sanctions, lobbies, actions].find(
    (result) => result.error,
  )?.error;
  if (firstError) throw firstError;

  const staffRows = (staff.data ?? []) as { user_id: string; display_name: string }[];
  const staffIds = new Set(staffRows.map((s) => s.user_id));
  const accountById = new Map(
    ((accounts.data ?? []) as { id: string; email: string; joined_at: string; last_sign_in_at: string | null }[]).map(
      (a) => [a.id, a],
    ),
  );
  const profileRows = (profiles.data ?? []) as unknown as ProfileRow[];
  const nameById = new Map(profileRows.map((p) => [p.id, p]));
  // Moderators are named on cases and the log by `admins.display_name`.
  setStaffNames(staffRows.map((row) => [row.user_id, row.display_name]));

  const players = profileRows
    .filter((row) => !staffIds.has(row.id))
    .map((row) => toPlayer(row, accountById.get(row.id), catalog));

  const lobbyRows = (lobbies.data ?? []) as LobbyRow[];
  const lobbyIds = lobbyRows.map((l) => l.id);
  const [members, messages] = lobbyIds.length
    ? await Promise.all([
        supabase.from("lobby_member").select("lobby_id, user_id").in("lobby_id", lobbyIds),
        supabase
          .from("lobby_messages")
          .select("id, lobby_id, sender_id, kind, body, created_at")
          .in("lobby_id", lobbyIds)
          .order("created_at", { ascending: true })
          .limit(5000),
      ])
    : [{ data: [] }, { data: [] }];

  const membersByLobby = new Map<string, string[]>();
  for (const m of (members.data ?? []) as { lobby_id: string; user_id: string }[]) {
    membersByLobby.set(m.lobby_id, [...(membersByLobby.get(m.lobby_id) ?? []), m.user_id]);
  }
  const messagesByLobby = new Map<string, LobbyMessage[]>();
  for (const m of (messages.data ?? []) as MessageRow[]) {
    const author = m.sender_id ? nameById.get(m.sender_id) : undefined;
    const message: LobbyMessage = {
      id: m.id,
      authorId: m.sender_id ?? "system",
      authorName: m.kind === "system" ? "System" : (author?.username ?? "Unknown"),
      avatar: author ? avatarUrl(author.avatar_path) : undefined,
      profileSlug: author?.username,
      body: m.body,
      sentAt: timeFormat.format(new Date(m.created_at)),
      isSystem: m.kind === "system",
    };
    messagesByLobby.set(m.lobby_id, [...(messagesByLobby.get(m.lobby_id) ?? []), message]);
  }

  const actionRows = (actions.data ?? []) as ActionRow[];
  // Who closed a lobby and why come from the audit log.
  const closures = new Map(
    actionRows.filter((a) => a.type === "lobby_closed").map((a) => [a.target_id, a]),
  );

  const adminLobbies: AdminLobby[] = lobbyRows.map((row) => {
    const game = catalog.find((g) => g.id === row.game_id);
    const mode = game?.modes.find((m) => m.id === row.mode_id);
    const closure = closures.get(row.id);
    const members = (membersByLobby.get(row.id) ?? []).filter((id) => id !== row.leader_id);
    return {
      id: row.id,
      name: row.name,
      game: game?.name ?? "—",
      cover: coverSrc(game?.slug ?? "", row.cover),
      mode: mode?.kind ?? "casual",
      status: lobbyStatus(row.status),
      region: row.region ?? "—",
      leaderId: row.leader_id,
      memberIds: [row.leader_id, ...members],
      slotsTotal: row.capacity,
      createdAt: row.created_at,
      closedAt: row.status === "cancelled" ? (row.closed_at ?? undefined) : undefined,
      closedBy: closure?.admin_id,
      closedReason: closure?.reason,
      messages: messagesByLobby.get(row.id) ?? [],
    };
  });

  const adminReports: AdminReport[] = ((reports.data ?? []) as ReportRow[]).map((row) => ({
    id: row.id,
    status: row.status,
    reason: row.reason,
    details: row.details ?? "",
    evidenceFileName: evidenceName(row.evidence_path, row.evidence_url),
    reporterId: row.reporter_id,
    targetId: row.target_id,
    source: row.lobby_id ? "lobby" : "profile",
    lobbyId: row.lobby_id ?? undefined,
    createdAt: row.created_at,
    assignedTo: row.assigned_to ?? undefined,
    resolution:
      row.resolved_at && row.resolved_by
        ? {
            outcome: row.resolution_outcome === "sanctioned" ? "sanctioned" : "rejected",
            sanctionId: row.sanction_id ?? undefined,
            note: row.resolution_note ?? "",
            resolvedBy: row.resolved_by,
            resolvedAt: row.resolved_at,
          }
        : undefined,
  }));

  const adminSanctions: Sanction[] = ((sanctions.data ?? []) as unknown as SanctionRow[]).map(
    (row) => ({
      id: row.id,
      playerId: row.player_id,
      type: row.type,
      durationDays: row.duration_days ?? undefined,
      reason: row.reason,
      note: row.note ?? "",
      reportIds: row.sanction_reports.map((link) => link.report_id),
      issuedBy: row.issued_by,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at ?? undefined,
      liftedAt: row.lifted_at ?? undefined,
      liftedBy: row.lifted_by ?? undefined,
      liftReason: row.lift_reason ?? undefined,
    }),
  );

  const adminActions: AdminAction[] = actionRows.map((row) => ({
    id: row.id,
    adminId: row.admin_id,
    type: row.type as AdminActionType,
    targetType: row.target_type,
    targetId: row.target_id,
    summary: row.summary,
    reason: row.reason,
    at: row.created_at,
  }));

  const notes: LowRating[] = (
    (lowRatings.data ?? []) as {
      ratee_id: string;
      stars: number;
      reason: string;
      lobby_id: string;
      created_at: string;
    }[]
  ).map((row) => ({
    playerId: row.ratee_id,
    stars: row.stars,
    reason: row.reason,
    lobbyId: row.lobby_id,
    at: row.created_at,
  }));

  return {
    players,
    reports: adminReports,
    sanctions: adminSanctions,
    lobbies: adminLobbies,
    actions: adminActions,
    lowRatings: notes,
  };
}

/** A short-lived link to a report's evidence file (private bucket). */
export async function evidenceLink(
  supabase: SupabaseClient,
  reportId: string,
): Promise<string | null> {
  const { data: row } = await supabase
    .from("reports")
    .select("evidence_path")
    .eq("id", reportId)
    .maybeSingle();
  const path = (row as { evidence_path: string | null } | null)?.evidence_path;
  if (!path) return null;
  const { data } = await supabase.storage.from("report-evidence").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

const errorWords: Record<string, string> = {
  not_admin: "Only staff accounts can do that.",
  reason_too_short: "Write a reason of at least 10 characters.",
  report_not_pending: "Someone already picked up this report.",
  report_closed: "This report has already been decided.",
  sanction_type_invalid: "Pick a warning or a suspension.",
  duration_invalid: "Pick a suspension length: 1, 3, 7 or 30 days.",
  rule_required: "Pick the rule that was broken.",
  cannot_sanction_staff: "Staff accounts can't be sanctioned.",
  player_not_found: "That player no longer exists.",
  sanction_not_active: "That sanction has already been lifted.",
  lobby_closed: "That lobby has already ended.",
  not_in_lobby: "That player isn't in the lobby any more.",
};

/** The database's refusal in the console's words. */
export function adminErrorMessage(error: { message?: string } | null | undefined): string {
  const text = error?.message ?? "";
  const key = Object.keys(errorWords).find((code) => text.includes(code));
  return key ? errorWords[key] : "That didn't save. Try again in a moment.";
}
