"use client";

import { useMemo, useState } from "react";
import { useAdminData } from "@/contexts/AdminDataContext";
import {
  reasonSeverity,
  reportReasons,
  type ReportStatus,
} from "@/data/admin-moderation";
import { reportSourceLabels, reportStatusMeta } from "@/data/admin-nav";
import { adminName } from "@/data/admin-accounts";
import { formatAgo, isUnresolved, sortReportQueue } from "@/lib/admin";
import {
  AdminBadge,
  AdminPageHeader,
  AdminRowLink,
  AdminSearch,
  AdminTable,
  Avatar,
  EmptyRow,
  StatusTabs,
  adminFieldClass,
  adminRowClass,
} from "./AdminUi";

type Tab = "unresolved" | ReportStatus | "all";

export default function ReportQueue() {
  const { reports, players, lobbies } = useAdminData();
  const [tab, setTab] = useState<Tab>("unresolved");
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("all");

  const playerById = (id: string) => players.find((p) => p.id === id);

  const count = (predicate: (status: ReportStatus) => boolean) =>
    reports.filter((report) => predicate(report.status)).length;

  const tabs: { value: Tab; label: string; count: number }[] = [
    {
      value: "unresolved",
      label: "Unresolved",
      count: reports.filter(isUnresolved).length,
    },
    { value: "open", label: "Open", count: count((s) => s === "open") },
    { value: "in_review", label: "In review", count: count((s) => s === "in_review") },
    { value: "resolved", label: "Actioned", count: count((s) => s === "resolved") },
    { value: "dismissed", label: "Dismissed", count: count((s) => s === "dismissed") },
    { value: "all", label: "All", count: reports.length },
  ];

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortReportQueue(
      reports.filter((report) => {
        if (tab === "unresolved" && !isUnresolved(report)) return false;
        if (tab !== "unresolved" && tab !== "all" && report.status !== tab) {
          return false;
        }
        if (reason !== "all" && report.reason !== reason) return false;
        if (!needle) return true;
        const target = players.find((p) => p.id === report.targetId);
        const reporter = players.find((p) => p.id === report.reporterId);
        return [report.id, target?.username, reporter?.username]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle));
      })
    );
  }, [reports, players, tab, reason, query]);

  // How many unresolved reports each player has, for the "+2 more" hint.
  const unresolvedByTarget = reports
    .filter(isUnresolved)
    .reduce<Record<string, number>>((acc, report) => {
      acc[report.targetId] = (acc[report.targetId] ?? 0) + 1;
      return acc;
    }, {});

  return (
    <>
      <AdminPageHeader
        title="Reports"
        description="High-severity reports come first, then whoever has waited longest."
      />

      <div className="flex flex-col gap-3">
        <StatusTabs tabs={tabs} value={tab} onChange={setTab} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <AdminSearch
            value={query}
            onChange={setQuery}
            placeholder="Search player or report ID"
          />
          <div className="relative sm:w-60">
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-label="Filter by reason"
              className={`${adminFieldClass} h-8 appearance-none pr-9`}
            >
              <option value="all">All reasons</option>
              {reportReasons.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img
              src="/icons/lfg-select-chevron.svg"
              alt=""
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50"
            />
          </div>
        </div>
      </div>

      <AdminTable
        head={["Report", "Reported player", "Reporter", "Context", "Filed", "Status"]}
      >
        {visible.length === 0 ? (
          <EmptyRow colSpan={6} label="No reports match these filters." />
        ) : (
          visible.map((report) => {
            const target = playerById(report.targetId);
            const reporter = playerById(report.reporterId);
            const lobby = lobbies.find((l) => l.id === report.lobbyId);
            const status = reportStatusMeta[report.status];
            const others = (unresolvedByTarget[report.targetId] ?? 0) - (isUnresolved(report) ? 1 : 0);

            return (
              <tr key={report.id} className={adminRowClass}>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <AdminRowLink href={`/admin/reports/${report.id}`}>
                        {report.reason}
                      </AdminRowLink>
                      {reasonSeverity(report.reason) === "high" && (
                        <AdminBadge tone="danger">High</AdminBadge>
                      )}
                    </div>
                    <span className="text-[11px] text-text-muted">
                      {report.id}
                      {report.evidenceFileName && " · has evidence"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {target && <Avatar src={target.avatar} size="sm" />}
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-subtle">
                        {target?.username ?? report.targetId}
                      </span>
                      {others > 0 && (
                        <span className="whitespace-nowrap text-[11px] text-warning">
                          +{others} more open
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {reporter?.username ?? report.reporterId}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-text-subtle">
                      {reportSourceLabels[report.source]}
                    </span>
                    {lobby && (
                      <span className="max-w-[160px] truncate text-[11px] text-text-muted">
                        {lobby.name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                  {formatAgo(report.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                    {report.status === "in_review" && report.assignedTo && (
                      <span className="text-[11px] text-text-muted">
                        {adminName(report.assignedTo)}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </AdminTable>
    </>
  );
}
