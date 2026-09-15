"use client";

import Link from "next/link";
import { useAdminData } from "@/contexts/AdminDataContext";
import { reasonSeverity } from "@/data/admin-moderation";
import { adminActionVerbs, reportStatusMeta } from "@/data/admin-nav";
import { adminName } from "@/data/admin-accounts";
import {
  accountStatus,
  actionTarget,
  formatAgo,
  isUnresolved,
  sortReportQueue,
} from "@/lib/admin";
import {
  AdminBadge,
  AdminCard,
  AdminPageHeader,
  Avatar,
  StatTile,
} from "./AdminUi";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminOverview() {
  const { user } = useAuth();
  const { reports, players, lobbies, sanctions, actions } = useAdminData();

  const unresolved = sortReportQueue(reports.filter(isUnresolved));
  const highSeverity = unresolved.filter(
    (report) => reasonSeverity(report.reason) === "high"
  ).length;
  const oldest = [...unresolved].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  )[0];
  const activeLobbies = lobbies.filter(
    (lobby) => lobby.status === "live" || lobby.status === "forming"
  );
  const restricted = players.filter((player) => {
    const status = accountStatus(player.id, sanctions);
    return status === "suspended" || status === "banned";
  }).length;

  const playerById = (id: string) => players.find((p) => p.id === id);

  // Several unresolved reports against one person usually matter more than
  // any single report — surface the pattern instead of making admins spot it.
  const repeatTargets = Object.entries(
    unresolved.reduce<Record<string, number>>((acc, report) => {
      acc[report.targetId] = (acc[report.targetId] ?? 0) + 1;
      return acc;
    }, {})
  )
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  const recentActions = [...actions]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  return (
    <>
      <AdminPageHeader
        title={`Welcome back, ${user?.name ?? "admin"}`}
        description="What needs a moderator right now."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Unresolved reports"
          value={unresolved.length}
          hint={`${highSeverity} high severity`}
          href="/admin/reports"
          tone={highSeverity > 0 ? "warning" : undefined}
        />
        <StatTile
          label="Longest waiting"
          value={oldest ? formatAgo(oldest.createdAt).replace(" ago", "") : "—"}
          hint={oldest ? oldest.reason : "Queue is clear"}
          href={oldest ? `/admin/reports/${oldest.id}` : undefined}
        />
        <StatTile
          label="Active lobbies"
          value={activeLobbies.length}
          hint={`${activeLobbies.filter((l) => l.status === "live").length} live now`}
          href="/admin/lobbies"
        />
        <StatTile
          label="Restricted accounts"
          value={restricted}
          hint="Suspended or banned"
          href="/admin/players"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <AdminCard
          title="Needs attention"
          action={
            <Link
              href="/admin/reports"
              className="text-xs font-semibold text-brand transition-opacity hover:opacity-80"
            >
              Open queue
            </Link>
          }
        >
          {unresolved.length === 0 ? (
            <p className="py-6 text-center text-xs text-text-muted">
              No unresolved reports. Nice.
            </p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {unresolved.slice(0, 6).map((report) => {
                const target = playerById(report.targetId);
                const status = reportStatusMeta[report.status];
                return (
                  <li key={report.id}>
                    <Link
                      href={`/admin/reports/${report.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
                    >
                      {target && <Avatar src={target.avatar} />}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-xs font-bold text-white">
                          {report.reason}
                        </span>
                        <span className="truncate text-[11px] text-text-muted">
                          {target?.username} · {formatAgo(report.createdAt)}
                        </span>
                      </div>
                      {reasonSeverity(report.reason) === "high" && (
                        <AdminBadge tone="danger">High</AdminBadge>
                      )}
                      <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminCard>

        <div className="flex flex-col gap-4">
          <AdminCard title="Repeat reports">
            {repeatTargets.length === 0 ? (
              <p className="text-xs text-text-muted">
                No player has more than one unresolved report.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {repeatTargets.map(([playerId, count]) => {
                  const player = playerById(playerId);
                  if (!player) return null;
                  return (
                    <li key={playerId}>
                      <Link
                        href={`/admin/players/${playerId}`}
                        className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-80"
                      >
                        <Avatar src={player.avatar} size="sm" />
                        <span className="flex-1 truncate text-xs font-bold text-white">
                          {player.username}
                        </span>
                        <span className="text-[11px] font-semibold text-warning">
                          {count} unresolved
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminCard>

          <AdminCard
            title="Recent activity"
            action={
              <Link
                href="/admin/audit-log"
                className="text-xs font-semibold text-brand transition-opacity hover:opacity-80"
              >
                Audit log
              </Link>
            }
          >
            <ul className="flex flex-col gap-3">
              {recentActions.map((action) => {
                const target = actionTarget(action, { players, lobbies, reports });
                return (
                  <li key={action.id} className="flex flex-col gap-0.5">
                    <span className="text-xs leading-relaxed text-text-subtle">
                      <span className="font-bold text-white">
                        {adminName(action.adminId)}
                      </span>{" "}
                      {action.type === "sanction_issued"
                        ? `issued a ${action.summary.toLowerCase()} to`
                        : adminActionVerbs[action.type]}{" "}
                      <Link
                        href={target.href}
                        className="font-semibold text-white hover:text-brand"
                      >
                        {target.label}
                      </Link>
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {formatAgo(action.at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
