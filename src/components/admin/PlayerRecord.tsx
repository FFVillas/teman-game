"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useAdminData } from "@/contexts/AdminDataContext";
import { useNotifications } from "@/contexts/NotificationContext";
import type { AdminReport, Sanction } from "@/data/admin-moderation";
import {
  accountStatusMeta,
  lobbyStatusMeta,
  reportStatusMeta,
} from "@/data/admin-nav";
import { adminName } from "@/data/admin-accounts";
import {
  accountStatus,
  activeRestriction,
  describeSanction,
  formatAgo,
  formatDate,
  formatDateTime,
  isRestricting,
  reporterCredibility,
  reportsAgainst,
  reportsFiledBy,
  sanctionsFor,
} from "@/lib/admin";
import {
  AdminBadge,
  AdminCard,
  AdminPageHeader,
  Avatar,
  adminButton,
} from "./AdminUi";
import { ReasonModal } from "./AdminModal";
import SanctionModal from "./SanctionModal";

function ReportList({
  reports,
  emptyLabel,
  personLabel,
}: {
  reports: AdminReport[];
  emptyLabel: string;
  personLabel: (report: AdminReport) => string;
}) {
  if (reports.length === 0) {
    return <p className="text-xs text-text-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border-subtle">
      {reports.map((report) => {
        const status = reportStatusMeta[report.status];
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
                <span className="truncate text-[11px] text-text-muted">
                  {personLabel(report)} · {formatAgo(report.createdAt)}
                </span>
              </div>
              <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function PlayerRecord({ playerId }: { playerId: string }) {
  const { toast } = useNotifications();
  const { players, reports, sanctions, lobbies, liftSanction } = useAdminData();
  const [sanctioning, setSanctioning] = useState(false);
  const [lifting, setLifting] = useState<Sanction | null>(null);

  const player = players.find((p) => p.id === playerId);
  if (!player) notFound();

  const status = accountStatus(player.id, sanctions);
  const statusMeta = accountStatusMeta[status];
  const restriction = activeRestriction(player.id, sanctions);
  const history = sanctionsFor(player.id, sanctions);
  const received = reportsAgainst(player.id, reports);
  const filed = reportsFiledBy(player.id, reports);
  const credibility = reporterCredibility(player.id, reports);
  const playerLobbies = lobbies
    .filter((lobby) => lobby.memberIds.includes(player.id) || lobby.leaderId === player.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const nameOf = (id: string) => players.find((p) => p.id === id)?.username ?? id;

  function canLift(sanction: Sanction) {
    if (sanction.liftedAt) return false;
    return sanction.type === "warning" || isRestricting(sanction);
  }

  function handleLift(reason: string) {
    if (!lifting) return;
    liftSanction(lifting.id, reason);
    toast({
      tone: "success",
      title: `${describeSanction(lifting)} lifted`,
      body: `${player!.username}'s record keeps the entry, marked as lifted.`,
    });
    setLifting(null);
  }

  return (
    <>
      <AdminPageHeader
        back={{ label: "All players", href: "/admin/players" }}
        title={
          <span className="flex items-center gap-3">
            <Avatar src={player.avatar} size="lg" dimmed={status === "banned"} />
            {player.username}
          </span>
        }
        meta={
          <>
            <AdminBadge tone={statusMeta.tone}>{statusMeta.label}</AdminBadge>
            <span className="text-[11px] text-text-muted">
              {player.email} · {player.region} · joined {formatDate(player.joinedAt)}
            </span>
          </>
        }
        actions={
          <>
            <a
              href={`/profile/${player.id}`}
              target="_blank"
              rel="noreferrer"
              className={adminButton.secondary}
            >
              Public profile
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/admin-external.svg" alt="" className="size-3 opacity-70" />
            </a>
            {restriction && (
              <button
                type="button"
                onClick={() => setLifting(restriction)}
                className={adminButton.secondary}
              >
                Lift {restriction.type === "ban" ? "ban" : "suspension"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSanctioning(true)}
              disabled={status === "banned"}
              className={adminButton.primary}
            >
              Issue sanction
            </button>
          </>
        }
      />

      {restriction && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
          {restriction.type === "ban"
            ? `Banned ${formatAgo(restriction.issuedAt)} for ${restriction.reason.toLowerCase()}.`
            : `Suspended until ${formatDateTime(restriction.expiresAt!)} for ${restriction.reason.toLowerCase()}.`}{" "}
          They can&apos;t log in or join lobbies.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <AdminCard title="Sanction history">
            {history.length === 0 ? (
              <p className="text-xs text-text-muted">No sanctions on record.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {history.map((sanction) => (
                  <li
                    key={sanction.id}
                    className="flex flex-col gap-2 rounded-xl border border-border-default bg-bg-page p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold ${sanction.liftedAt ? "text-text-muted line-through" : "text-white"}`}
                        >
                          {describeSanction(sanction)}
                        </span>
                        {isRestricting(sanction) && <AdminBadge tone="danger">In effect</AdminBadge>}
                        {sanction.liftedAt && <AdminBadge tone="muted">Lifted</AdminBadge>}
                      </div>
                      {canLift(sanction) && (
                        <button
                          type="button"
                          onClick={() => setLifting(sanction)}
                          className="text-[11px] font-semibold text-brand transition-opacity hover:opacity-80"
                        >
                          Lift
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-text-subtle">{sanction.reason}</span>
                    <p className="text-xs leading-relaxed text-text-muted">{sanction.note}</p>
                    <span className="text-[11px] text-text-muted">
                      {adminName(sanction.issuedBy)} · {formatDateTime(sanction.issuedAt)}
                      {sanction.expiresAt && !sanction.liftedAt && (
                        <> · ends {formatDateTime(sanction.expiresAt)}</>
                      )}
                      {sanction.reportIds.length > 0 && (
                        <>
                          {" · "}
                          {sanction.reportIds.map((id, index) => (
                            <span key={id}>
                              {index > 0 && ", "}
                              <Link href={`/admin/reports/${id}`} className="text-brand hover:opacity-80">
                                {id}
                              </Link>
                            </span>
                          ))}
                        </>
                      )}
                    </span>
                    {sanction.liftedAt && (
                      <span className="text-[11px] text-text-muted">
                        Lifted by {adminName(sanction.liftedBy)} ·{" "}
                        {formatDateTime(sanction.liftedAt)} — {sanction.liftReason}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </AdminCard>

          <AdminCard title={`Reports against ${player.username}`}>
            <ReportList
              reports={received}
              emptyLabel="Nobody has reported this player."
              personLabel={(report) => `by ${nameOf(report.reporterId)}`}
            />
          </AdminCard>

          <AdminCard title={`Reports filed by ${player.username}`}>
            {credibility.flagged && (
              <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-warning">
                {credibility.dismissed} of {credibility.dismissed + credibility.upheld} decided
                reports were dismissed.
              </p>
            )}
            <ReportList
              reports={filed}
              emptyLabel="This player hasn't filed any reports."
              personLabel={(report) => `against ${nameOf(report.targetId)}`}
            />
          </AdminCard>
        </div>

        <div className="flex flex-col gap-4">
          <AdminCard title="Account">
            <dl className="flex flex-col gap-2.5 text-xs">
              {[
                {
                  label: "Reputation",
                  value: player.reputation
                    ? `${player.reputation.toFixed(1)} from ${player.reviewCount} reviews`
                    : "No reviews yet",
                },
                { label: "Main game", value: player.mainGame },
                { label: "Rank", value: player.rank?.name ?? "Not set" },
                { label: "Region", value: player.region },
                { label: "Last active", value: formatAgo(player.lastActiveAt) },
              ].map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="text-text-muted">{row.label}</dt>
                  <dd className="text-right font-semibold text-white">{row.value}</dd>
                </div>
              ))}
            </dl>
          </AdminCard>

          <AdminCard title="Lobbies">
            {playerLobbies.length === 0 ? (
              <p className="text-xs text-text-muted">No lobbies on record.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {playerLobbies.map((lobby) => (
                  <li key={lobby.id}>
                    <Link
                      href={`/admin/lobbies/${lobby.id}`}
                      className="flex items-center justify-between gap-2 transition-opacity hover:opacity-80"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-bold text-white">{lobby.name}</span>
                        <span className="text-[11px] text-text-muted">
                          {lobby.leaderId === player.id ? "Leader" : "Member"} ·{" "}
                          {formatAgo(lobby.createdAt)}
                        </span>
                      </span>
                      <AdminBadge tone={lobbyStatusMeta[lobby.status].tone}>
                        {lobbyStatusMeta[lobby.status].label}
                      </AdminBadge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      </div>

      {sanctioning && (
        <SanctionModal player={player} reportIds={[]} onClose={() => setSanctioning(false)} />
      )}

      {lifting && (
        <ReasonModal
          title={`Lift ${describeSanction(lifting).toLowerCase()}`}
          description={
            lifting.type === "warning"
              ? "The warning stays on record, marked as lifted, and no longer counts toward their standing."
              : "Access is restored immediately. The sanction stays on record, marked as lifted."
          }
          placeholder="e.g. Appeal accepted — new evidence shows the clip was edited."
          confirmLabel="Lift sanction"
          onConfirm={handleLift}
          onClose={() => setLifting(null)}
        />
      )}
    </>
  );
}
