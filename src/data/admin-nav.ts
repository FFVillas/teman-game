import type {
  AccountStatus,
  AdminActionType,
  AdminLobbyStatus,
  ReportSource,
  ReportStatus,
} from "./admin-moderation";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
  /** Shows the unresolved report count next to the label. */
  badge?: "openReports";
}

export const adminNavItems: AdminNavItem[] = [
  { label: "Overview", href: "/admin", icon: "/icons/admin-overview.svg" },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: "/icons/admin-reports.svg",
    badge: "openReports",
  },
  { label: "Players", href: "/admin/players", icon: "/icons/admin-players.svg" },
  { label: "Lobbies", href: "/admin/lobbies", icon: "/icons/admin-lobbies.svg" },
  { label: "Audit log", href: "/admin/audit-log", icon: "/icons/admin-audit.svg" },
];

/** Badge tone → utility classes. Colours come from theme tokens. */
export type AdminTone = "brand" | "success" | "warning" | "danger" | "muted";

export const adminToneClasses: Record<AdminTone, string> = {
  brand: "border-brand/30 bg-brand/10 text-brand",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  muted: "border-border-strong bg-white/5 text-text-muted",
};

export const reportStatusMeta: Record<
  ReportStatus,
  { label: string; tone: AdminTone }
> = {
  open: { label: "Open", tone: "brand" },
  in_review: { label: "In review", tone: "warning" },
  resolved: { label: "Actioned", tone: "success" },
  dismissed: { label: "Dismissed", tone: "muted" },
};

export const accountStatusMeta: Record<
  AccountStatus,
  { label: string; tone: AdminTone }
> = {
  active: { label: "Active", tone: "success" },
  warned: { label: "Warned", tone: "warning" },
  suspended: { label: "Suspended", tone: "danger" },
  banned: { label: "Banned", tone: "danger" },
};

export const lobbyStatusMeta: Record<
  AdminLobbyStatus,
  { label: string; tone: AdminTone }
> = {
  forming: { label: "Forming", tone: "brand" },
  live: { label: "Live", tone: "success" },
  completed: { label: "Completed", tone: "muted" },
  closed: { label: "Closed by admin", tone: "danger" },
};

export const reportSourceLabels: Record<ReportSource, string> = {
  lobby: "Lobby",
  profile: "Profile",
  match: "Match history",
};

export const adminActionLabels: Record<AdminActionType, string> = {
  report_claimed: "Claimed report",
  report_dismissed: "Dismissed report",
  sanction_issued: "Issued sanction",
  sanction_lifted: "Lifted sanction",
  lobby_closed: "Closed lobby",
  member_removed: "Removed member",
};

/** Sentence form for activity feeds: "<admin> <verb> <target>". */
export const adminActionVerbs: Record<AdminActionType, string> = {
  report_claimed: "claimed",
  report_dismissed: "dismissed",
  sanction_issued: "sanctioned",
  sanction_lifted: "lifted a sanction on",
  lobby_closed: "closed",
  member_removed: "removed a member from",
};
