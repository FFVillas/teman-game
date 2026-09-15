"use client";

import { useState } from "react";
import { useAdminData } from "@/contexts/AdminDataContext";
import type { AdminLobbyStatus } from "@/data/admin-moderation";
import { lobbyStatusMeta } from "@/data/admin-nav";
import { formatAgo, isUnresolved } from "@/lib/admin";
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

type Tab = AdminLobbyStatus | "all";

const statusOrder: Record<AdminLobbyStatus, number> = {
  live: 0,
  forming: 1,
  completed: 2,
  closed: 3,
};

export default function LobbyDirectory() {
  const { lobbies, players, reports } = useAdminData();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const statuses: AdminLobbyStatus[] = ["live", "forming", "completed", "closed"];
  const tabs = [
    { value: "all" as Tab, label: "All", count: lobbies.length },
    ...statuses.map((status) => ({
      value: status as Tab,
      label: status === "closed" ? "Closed" : lobbyStatusMeta[status].label,
      count: lobbies.filter((lobby) => lobby.status === status).length,
    })),
  ];

  const needle = query.trim().toLowerCase();
  const visible = lobbies
    .filter((lobby) => tab === "all" || lobby.status === tab)
    .filter((lobby) => {
      if (!needle) return true;
      const leader = players.find((p) => p.id === lobby.leaderId);
      return (
        lobby.name.toLowerCase().includes(needle) ||
        !!leader?.username.toLowerCase().includes(needle)
      );
    })
    .sort(
      (a, b) =>
        statusOrder[a.status] - statusOrder[b.status] ||
        b.createdAt.localeCompare(a.createdAt)
    );

  return (
    <>
      <AdminPageHeader
        title="Lobbies"
        description="Every lobby, running or finished. Close one that breaks the rules."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusTabs tabs={tabs} value={tab} onChange={setTab} />
        <AdminSearch value={query} onChange={setQuery} placeholder="Search lobby or leader" />
      </div>

      <AdminTable head={["Lobby", "Leader", "Members", "Reports", "Created", "Status"]}>
        {visible.length === 0 ? (
          <EmptyRow colSpan={6} label="No lobbies match." />
        ) : (
          visible.map((lobby) => {
            const leader = players.find((p) => p.id === lobby.leaderId);
            const linked = reports.filter((r) => r.lobbyId === lobby.id);
            const unresolved = linked.filter(isUnresolved).length;
            const status = lobbyStatusMeta[lobby.status];
            return (
              <tr key={lobby.id} className={adminRowClass}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- small cover thumbnail, no benefit from next/image optimization */}
                    <img
                      src={lobby.cover}
                      alt=""
                      className="size-9 shrink-0 rounded-lg object-cover object-top"
                    />
                    <div className="flex min-w-0 flex-col">
                      <AdminRowLink href={`/admin/lobbies/${lobby.id}`}>
                        {lobby.name}
                      </AdminRowLink>
                      <span className="text-[11px] capitalize text-text-muted">
                        {lobby.game} · {lobby.mode} · {lobby.region}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {leader && (
                    <div className="flex items-center gap-2">
                      <Avatar src={leader.avatar} size="sm" />
                      <span className="text-text-subtle">{leader.username}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-text-subtle">
                  {lobby.memberIds.length}/{lobby.slotsTotal}
                </td>
                <td className="px-4 py-3">
                  {unresolved > 0 ? (
                    <span className="whitespace-nowrap font-semibold text-warning">{unresolved} unresolved</span>
                  ) : (
                    <span className="text-text-muted">{linked.length}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                  {formatAgo(lobby.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                </td>
              </tr>
            );
          })
        )}
      </AdminTable>
    </>
  );
}
