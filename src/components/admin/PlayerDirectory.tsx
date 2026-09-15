"use client";

import { useMemo, useState } from "react";
import { useAdminData } from "@/contexts/AdminDataContext";
import type { AccountStatus } from "@/data/admin-moderation";
import { accountStatusMeta } from "@/data/admin-nav";
import {
  accountStatus,
  activeRestriction,
  formatAgo,
  isUnresolved,
  reportsAgainst,
  sanctionsFor,
} from "@/lib/admin";
import {
  AdminBadge,
  AdminPageHeader,
  AdminRowLink,
  AdminSearch,
  AdminTable,
  Avatar,
  EmptyRow,
  StatusTabs,
  adminRowClass,
} from "./AdminUi";

type Tab = AccountStatus | "all";

export default function PlayerDirectory() {
  const { players, reports, sanctions } = useAdminData();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      players.map((player) => {
        const received = reportsAgainst(player.id, reports);
        return {
          player,
          status: accountStatus(player.id, sanctions),
          restriction: activeRestriction(player.id, sanctions),
          openReports: received.filter(isUnresolved).length,
          totalReports: received.length,
          sanctionCount: sanctionsFor(player.id, sanctions).length,
        };
      }),
    [players, reports, sanctions]
  );

  const statuses: AccountStatus[] = ["active", "warned", "suspended", "banned"];
  const tabs = [
    { value: "all" as Tab, label: "All", count: rows.length },
    ...statuses.map((status) => ({
      value: status as Tab,
      label: accountStatusMeta[status].label,
      count: rows.filter((row) => row.status === status).length,
    })),
  ];

  const needle = query.trim().toLowerCase();
  const visible = rows
    .filter((row) => tab === "all" || row.status === tab)
    .filter(
      (row) =>
        !needle ||
        row.player.username.toLowerCase().includes(needle) ||
        row.player.email.toLowerCase().includes(needle)
    )
    // People with unresolved reports float up; everyone else alphabetical.
    .sort(
      (a, b) =>
        b.openReports - a.openReports ||
        a.player.username.localeCompare(b.player.username)
    );

  return (
    <>
      <AdminPageHeader
        title="Players"
        description="Account standing, report history and sanctions for every player."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusTabs tabs={tabs} value={tab} onChange={setTab} />
        <AdminSearch value={query} onChange={setQuery} placeholder="Search name or email" />
      </div>

      <AdminTable
        head={["Player", "Status", "Reputation", "Reports", "Sanctions", "Last active"]}
      >
        {visible.length === 0 ? (
          <EmptyRow colSpan={6} label="No players match." />
        ) : (
          visible.map(({ player, status, restriction, openReports, totalReports, sanctionCount }) => (
            <tr key={player.id} className={adminRowClass}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar src={player.avatar} dimmed={status === "banned"} />
                  <div className="flex min-w-0 flex-col">
                    <AdminRowLink href={`/admin/players/${player.id}`}>
                      {player.username}
                    </AdminRowLink>
                    <span className="truncate text-[11px] text-text-muted">
                      {player.email}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <AdminBadge tone={accountStatusMeta[status].tone}>
                    {accountStatusMeta[status].label}
                  </AdminBadge>
                  {restriction?.expiresAt && (
                    <span className="text-[11px] text-text-muted">
                      ends {formatAgo(restriction.expiresAt)}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-bold text-white">
                  {player.reputation?.toFixed(1) ?? "—"}
                </span>
                <span className="text-text-muted"> · {player.reviewCount}</span>
              </td>
              <td className="px-4 py-3">
                {openReports > 0 ? (
                  <span className="whitespace-nowrap font-semibold text-warning">
                    {openReports} unresolved
                  </span>
                ) : (
                  <span className="text-text-muted">{totalReports} total</span>
                )}
              </td>
              <td className="px-4 py-3 text-text-muted">{sanctionCount}</td>
              <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                {formatAgo(player.lastActiveAt)}
              </td>
            </tr>
          ))
        )}
      </AdminTable>
    </>
  );
}
