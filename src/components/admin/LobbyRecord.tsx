"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useAdminData } from "@/contexts/AdminDataContext";
import { useNotifications } from "@/contexts/NotificationContext";
import type { AdminPlayer } from "@/data/admin-moderation";
import {
  accountStatusMeta,
  lobbyStatusMeta,
  reportStatusMeta,
} from "@/data/admin-nav";
import { adminName } from "@/data/admin-accounts";
import { accountStatus, formatAgo, formatDateTime } from "@/lib/admin";
import {
  AdminBadge,
  AdminCard,
  AdminPageHeader,
  Avatar,
  adminButton,
} from "./AdminUi";
import { ReasonModal } from "./AdminModal";

export default function LobbyRecord({ lobbyId }: { lobbyId: string }) {
  const { toast } = useNotifications();
  const { lobbies, players, reports, sanctions, closeLobby, removeLobbyMember } =
    useAdminData();
  const [closing, setClosing] = useState(false);
  const [removing, setRemoving] = useState<AdminPlayer | null>(null);

  const lobby = lobbies.find((l) => l.id === lobbyId);
  if (!lobby) notFound();

  const status = lobbyStatusMeta[lobby.status];
  const isActive = lobby.status === "live" || lobby.status === "forming";
  const members = lobby.memberIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is AdminPlayer => Boolean(p));
  const linkedReports = reports
    .filter((r) => r.lobbyId === lobby.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const reportedIds = new Set(linkedReports.map((r) => r.targetId));

  function handleClose(reason: string) {
    closeLobby(lobby!.id, reason);
    setClosing(false);
    toast({
      tone: "success",
      title: `${lobby!.name} closed`,
      body: "Chat is locked and every member is notified.",
    });
  }

  function handleRemove(reason: string) {
    if (!removing) return;
    removeLobbyMember(lobby!.id, removing.id, reason);
    toast({ tone: "info", title: `${removing.username} removed from ${lobby!.name}` });
    setRemoving(null);
  }

  return (
    <>
      <AdminPageHeader
        back={{ label: "All lobbies", href: "/admin/lobbies" }}
        title={lobby.name}
        meta={
          <>
            <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
            <span className="text-[11px] text-text-muted">
              <span className="capitalize">
                {lobby.game} · {lobby.mode}
              </span>{" "}
              · {lobby.region} · created {formatAgo(lobby.createdAt)}
            </span>
          </>
        }
        actions={
          isActive && (
            <button
              type="button"
              onClick={() => setClosing(true)}
              className={adminButton.ghostDanger}
            >
              Close lobby
            </button>
          )
        }
      />

      {lobby.status === "closed" && lobby.closedAt && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs leading-relaxed text-danger">
          Closed by {adminName(lobby.closedBy)} · {formatDateTime(lobby.closedAt)} —{" "}
          {lobby.closedReason}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <AdminCard title={`Roster · ${members.length}/${lobby.slotsTotal}`}>
            {members.length === 0 ? (
              <p className="text-xs text-text-muted">No members left.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle">
                {members.map((member) => {
                  const memberStatus = accountStatus(member.id, sanctions);
                  return (
                    <li key={member.id} className="flex items-center gap-3 py-2.5">
                      <Avatar src={member.avatar} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <Link
                          href={`/admin/players/${member.id}`}
                          className="truncate text-xs font-bold text-white hover:text-brand"
                        >
                          {member.username}
                          {member.id === lobby.leaderId && (
                            <span className="ml-2 font-normal text-text-muted">Leader</span>
                          )}
                        </Link>
                        <span className="text-[11px] text-text-muted">
                          Reputation {member.reputation?.toFixed(1) ?? "—"}
                          {reportedIds.has(member.id) && (
                            <span className="text-warning"> · reported in this lobby</span>
                          )}
                        </span>
                      </div>
                      {memberStatus !== "active" && (
                        <AdminBadge tone={accountStatusMeta[memberStatus].tone}>
                          {accountStatusMeta[memberStatus].label}
                        </AdminBadge>
                      )}
                      {isActive && member.id !== lobby.leaderId && (
                        <button
                          type="button"
                          onClick={() => setRemoving(member)}
                          className="text-[11px] font-semibold text-text-muted transition-colors hover:text-danger"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminCard>

          <AdminCard title="Reports from this lobby">
            {linkedReports.length === 0 ? (
              <p className="text-xs text-text-muted">No reports were filed here.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle">
                {linkedReports.map((report) => {
                  const reportStatus = reportStatusMeta[report.status];
                  const target = players.find((p) => p.id === report.targetId);
                  return (
                    <li key={report.id}>
                      <Link
                        href={`/admin/reports/${report.id}`}
                        className="flex items-center gap-3 py-2.5 transition-opacity hover:opacity-80"
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-xs font-bold text-white">
                            {report.reason}
                          </span>
                          <span className="text-[11px] text-text-muted">
                            against {target?.username} · {formatAgo(report.createdAt)}
                          </span>
                        </div>
                        <AdminBadge tone={reportStatus.tone}>{reportStatus.label}</AdminBadge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminCard>
        </div>

        <AdminCard title="Chat log" className="self-start">
          {lobby.messages.length === 0 ? (
            <p className="text-xs text-text-muted">No messages yet.</p>
          ) : (
            <ol className="flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
              {lobby.messages.map((message) =>
                message.isSystem ? (
                  <li key={message.id} className="py-0.5 text-center text-[11px] text-text-muted">
                    {message.body} · {message.sentAt}
                  </li>
                ) : (
                  <li
                    key={message.id}
                    className={`flex gap-2.5 rounded-lg border-l-2 px-2.5 py-1.5 ${
                      reportedIds.has(message.authorId)
                        ? "border-warning/70 bg-warning/[0.06]"
                        : "border-transparent"
                    }`}
                  >
                    {message.avatar && <Avatar src={message.avatar} size="sm" />}
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[11px] font-bold text-white">
                        {message.authorName}
                        <span className="ml-2 font-normal text-text-muted">{message.sentAt}</span>
                      </span>
                      <span className="text-xs text-text-subtle">{message.body}</span>
                    </div>
                  </li>
                )
              )}
            </ol>
          )}
          <p className="text-[11px] text-text-muted">
            Read-only. Messages from reported players are highlighted.
          </p>
        </AdminCard>
      </div>

      {closing && (
        <ReasonModal
          title={`Close ${lobby.name}`}
          description="Ends the lobby for everyone: chat is locked and it disappears from the lobby list. The roster stays on record here. Every member is notified with this reason."
          placeholder="e.g. Lobby bio advertises a cheat seller."
          hint="Shown to members and saved to the audit log."
          confirmLabel="Close lobby"
          tone="danger"
          onConfirm={handleClose}
          onClose={() => setClosing(false)}
        />
      )}

      {removing && (
        <ReasonModal
          title={`Remove ${removing.username}`}
          description={`${removing.username} is taken out of this lobby and can't rejoin it. This is not a sanction — use Take action on a report for that.`}
          placeholder="e.g. Harassing other members in chat while the report is reviewed."
          confirmLabel="Remove member"
          tone="danger"
          onConfirm={handleRemove}
          onClose={() => setRemoving(null)}
        />
      )}
    </>
  );
}
