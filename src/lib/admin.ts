import {
  WARNING_WINDOW_DAYS,
  reasonSeverity,
  sanctionLabels,
  type AccountStatus,
  type AdminAction,
  type AdminData,
  type AdminReport,
  type Sanction,
  type SanctionType,
} from "@/data/admin-moderation";

/**
 * Derived views over the admin data. Kept as pure functions so the same rules
 * can move server-side (or into SQL views) without the UI changing.
 */

const DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

export function formatAgo(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const future = diff < 0;
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60_000);

  let label: string;
  if (minutes < 1) return "just now";
  if (minutes < 60) label = `${minutes}m`;
  else if (minutes < 60 * 24) label = `${Math.round(minutes / 60)}h`;
  else label = `${Math.round(minutes / (60 * 24))}d`;

  return future ? `in ${label}` : `${label} ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Sanctions and account status
// ---------------------------------------------------------------------------

/** A ban or an unexpired suspension that hasn't been lifted. */
export function isRestricting(sanction: Sanction, now = Date.now()): boolean {
  if (sanction.liftedAt) return false;
  if (sanction.type === "ban") return true;
  if (sanction.type === "suspension" && sanction.expiresAt) {
    return new Date(sanction.expiresAt).getTime() > now;
  }
  return false;
}

export function sanctionsFor(playerId: string, sanctions: Sanction[]) {
  return sanctions
    .filter((sanction) => sanction.playerId === playerId)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

/** The sanction currently stopping this player from using the app, if any. */
export function activeRestriction(
  playerId: string,
  sanctions: Sanction[],
  now = Date.now()
): Sanction | undefined {
  const current = sanctionsFor(playerId, sanctions).filter((sanction) =>
    isRestricting(sanction, now)
  );
  return current.find((s) => s.type === "ban") ?? current[0];
}

/**
 * Derived rather than stored, so it can never drift from the sanction
 * history. In the database this is worth materialising on `user` for the
 * login check, but the sanctions table stays the source of truth.
 */
export function accountStatus(
  playerId: string,
  sanctions: Sanction[],
  now = Date.now()
): AccountStatus {
  const restriction = activeRestriction(playerId, sanctions, now);
  if (restriction?.type === "ban") return "banned";
  if (restriction?.type === "suspension") return "suspended";

  const recentWarning = sanctionsFor(playerId, sanctions).some(
    (sanction) =>
      sanction.type === "warning" &&
      !sanction.liftedAt &&
      now - new Date(sanction.issuedAt).getTime() < WARNING_WINDOW_DAYS * DAY
  );
  return recentWarning ? "warned" : "active";
}

/**
 * Graduated enforcement: warning → suspension → ban. Only a suggestion — the
 * admin always picks, and severe first offences can skip straight up.
 */
export function suggestedSanction(
  playerId: string,
  sanctions: Sanction[]
): { type: SanctionType; durationDays?: number; because: string } {
  const history = sanctionsFor(playerId, sanctions).filter((s) => !s.liftedAt);
  const suspensions = history.filter((s) => s.type === "suspension").length;
  const warnings = history.filter((s) => s.type === "warning").length;

  if (suspensions > 0) {
    return {
      type: "ban",
      because: `${suspensions} previous suspension${suspensions === 1 ? "" : "s"}`,
    };
  }
  if (warnings > 0) {
    return {
      type: "suspension",
      durationDays: 7,
      because: `${warnings} previous warning${warnings === 1 ? "" : "s"}`,
    };
  }
  return { type: "warning", because: "No previous sanctions" };
}

export function describeSanction(
  sanction: Pick<Sanction, "type" | "durationDays">
): string {
  if (sanction.type === "suspension" && sanction.durationDays) {
    return `${sanction.durationDays}-day suspension`;
  }
  return sanctionLabels[sanction.type];
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export function actionTarget(
  action: AdminAction,
  data: Pick<AdminData, "players" | "lobbies" | "reports">
): { label: string; href: string } {
  if (action.targetType === "player") {
    const player = data.players.find((p) => p.id === action.targetId);
    return {
      label: player?.username ?? action.targetId,
      href: `/admin/players/${action.targetId}`,
    };
  }
  if (action.targetType === "lobby") {
    const lobby = data.lobbies.find((l) => l.id === action.targetId);
    return {
      label: lobby?.name ?? action.targetId,
      href: `/admin/lobbies/${action.targetId}`,
    };
  }
  const report = data.reports.find((r) => r.id === action.targetId);
  const target = report
    ? data.players.find((p) => p.id === report.targetId)
    : undefined;
  return {
    label: target ? `the report on ${target.username}` : action.targetId,
    href: `/admin/reports/${action.targetId}`,
  };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export function isUnresolved(report: AdminReport): boolean {
  return report.status === "open" || report.status === "in_review";
}

export function reportsAgainst(playerId: string, reports: AdminReport[]) {
  return reports
    .filter((report) => report.targetId === playerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function reportsFiledBy(playerId: string, reports: AdminReport[]) {
  return reports
    .filter((report) => report.reporterId === playerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * How often this person's reports hold up. Flagged once they've had a few
 * decided and most were dismissed — a signal that the report button is being
 * used as a weapon, not a reason to ignore them.
 */
export function reporterCredibility(playerId: string, reports: AdminReport[]) {
  const filed = reportsFiledBy(playerId, reports);
  const dismissed = filed.filter((r) => r.status === "dismissed").length;
  const upheld = filed.filter((r) => r.status === "resolved").length;
  const decided = dismissed + upheld;
  return {
    filed: filed.length,
    dismissed,
    upheld,
    flagged: decided >= 2 && dismissed / decided >= 0.5,
  };
}

/**
 * Queue order: unresolved first, high severity first, then oldest first — the
 * person who's waited longest gets seen next. Closed cases go newest first.
 */
export function sortReportQueue(reports: AdminReport[]): AdminReport[] {
  return [...reports].sort((a, b) => {
    const aOpen = isUnresolved(a);
    const bOpen = isUnresolved(b);
    if (aOpen !== bOpen) return aOpen ? -1 : 1;

    if (aOpen) {
      const aHigh = reasonSeverity(a.reason) === "high";
      const bHigh = reasonSeverity(b.reason) === "high";
      if (aHigh !== bHigh) return aHigh ? -1 : 1;
      return a.createdAt.localeCompare(b.createdAt);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}
