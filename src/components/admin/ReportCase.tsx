"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useAdminData } from "@/contexts/AdminDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { reasonSeverity } from "@/data/admin-moderation";
import {
  accountStatusMeta,
  lobbyStatusMeta,
  reportSourceLabels,
  reportStatusMeta,
} from "@/data/admin-nav";
import { adminName } from "@/data/admin-accounts";
import {
  accountStatus,
  describeSanction,
  formatAgo,
  formatDate,
  formatDateTime,
  isUnresolved,
  reportsAgainst,
  reporterCredibility,
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

/**
 * One report, with everything needed to decide it on a single screen: what
 * was said, the lobby chat it happened in, whether this player has a pattern,
 * and whether this reporter's reports usually hold up.
 */
export default function ReportCase({ reportId }: { reportId: string }) {
  const { user } = useAuth();
  const { toast } = useNotifications();
  const data = useAdminData();
  const { reports, players, lobbies, sanctions, claimReport, dismissReport } =
    data;

  const [modal, setModal] = useState<"dismiss" | "sanction" | null>(null);
  const [alsoClose, setAlsoClose] = useState<string[]>([]);

  const report = reports.find((r) => r.id === reportId);
  if (!report) notFound();

  const target = players.find((p) => p.id === report.targetId);
  const reporter = players.find((p) => p.id === report.reporterId);
  const lobby = lobbies.find((l) => l.id === report.lobbyId);
  const status = reportStatusMeta[report.status];
  const unresolved = isUnresolved(report);
  const claimedByOther =
    report.status === "in_review" && report.assignedTo && report.assignedTo !== user?.id;

  const otherReports = target
    ? reportsAgainst(target.id, reports).filter((r) => r.id !== report.id)
    : [];
  const targetSanctions = target ? sanctionsFor(target.id, sanctions) : [];
  const credibility = reporter
    ? reporterCredibility(reporter.id, reports)
    : undefined;
  const linkedSanction = sanctions.find(
    (s) => s.id === report.resolution?.sanctionId
  );

  function toggleAlsoClose(id: string) {
    setAlsoClose((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleClaim() {
    claimReport(report!.id);
    toast({ tone: "info", title: "Case claimed", body: "Other admins will see you're on it." });
  }

  function handleDismiss(note: string) {
    dismissReport(report!.id, note);
    setModal(null);
    toast({ tone: "info", title: "Report dismissed", body: "No action taken against the player." });
  }

  return (
    <>
      <AdminPageHeader
        back={{ label: "All reports", href: "/admin/reports" }}
        title={report.reason}
        meta={
          <>
            <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
            {reasonSeverity(report.reason) === "high" && (
              <AdminBadge tone="danger">High severity</AdminBadge>
            )}
            <span className="text-[11px] text-text-muted">
              {report.id} · filed {formatAgo(report.createdAt)} from{" "}
              {reportSourceLabels[report.source].toLowerCase()}
              {report.assignedTo && unresolved && (
                <> · claimed by {adminName(report.assignedTo)}</>
              )}
            </span>
          </>
        }
        actions={
          unresolved && (
            <>
              {report.status === "open" && (
                <button type="button" onClick={handleClaim} className={adminButton.secondary}>
                  Claim case
                </button>
              )}
              <button
                type="button"
                onClick={() => setModal("dismiss")}
                className={adminButton.secondary}
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => setModal("sanction")}
                className={adminButton.primary}
                disabled={!target}
              >
                Take action
              </button>
            </>
          )
        }
      />

      {claimedByOther && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
          {adminName(report.assignedTo)} claimed this case. Check with them
          before deciding it yourself.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <AdminCard title="What the reporter said">
            <p className="text-sm leading-relaxed text-text-subtle">
              &ldquo;{report.details}&rdquo;
            </p>
            {report.evidenceFileName ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-border-default bg-bg-page px-3 py-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img src="/icons/admin-attachment.svg" alt="" className="size-4 opacity-70" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-semibold text-white">
                    {report.evidenceFileName}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    Preview available once file storage is connected.
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-text-muted">No evidence attached.</p>
            )}
          </AdminCard>

          {lobby && (
            <AdminCard
              title="Lobby chat"
              action={
                <Link
                  href={`/admin/lobbies/${lobby.id}`}
                  className="flex items-center gap-2 text-xs font-semibold text-brand transition-opacity hover:opacity-80"
                >
                  {lobby.name}
                  <AdminBadge tone={lobbyStatusMeta[lobby.status].tone}>
                    {lobbyStatusMeta[lobby.status].label}
                  </AdminBadge>
                </Link>
              }
            >
              {lobby.messages.length === 0 ? (
                <p className="text-xs text-text-muted">No messages in this lobby.</p>
              ) : (
                <>
                  <ol className="flex flex-col gap-1.5">
                    {lobby.messages.map((message) => {
                      if (message.isSystem) {
                        return (
                          <li
                            key={message.id}
                            className="py-0.5 text-center text-[11px] text-text-muted"
                          >
                            {message.body} · {message.sentAt}
                          </li>
                        );
                      }
                      const byTarget = message.authorId === report.targetId;
                      return (
                        <li
                          key={message.id}
                          className={`flex gap-2.5 rounded-lg border-l-2 px-3 py-2 ${
                            byTarget
                              ? "border-danger bg-danger/[0.07]"
                              : "border-transparent"
                          }`}
                        >
                          {message.avatar && <Avatar src={message.avatar} size="sm" />}
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-[11px] font-bold text-white">
                              {message.authorName}
                              <span className="ml-2 font-normal text-text-muted">
                                {message.sentAt}
                              </span>
                            </span>
                            <span className="text-xs text-text-subtle">{message.body}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {target && (
                    <p className="text-[11px] text-text-muted">
                      Messages from {target.username} are highlighted.
                    </p>
                  )}
                </>
              )}
            </AdminCard>
          )}

          <AdminCard title={`Other reports against ${target?.username ?? "this player"}`}>
            {otherReports.length === 0 ? (
              <p className="text-xs text-text-muted">
                This is the only report against them.
              </p>
            ) : (
              <>
                <ul className="flex flex-col divide-y divide-border-subtle">
                  {otherReports.map((other) => {
                    const otherStatus = reportStatusMeta[other.status];
                    const otherReporter = players.find((p) => p.id === other.reporterId);
                    const selectable = unresolved && isUnresolved(other);
                    return (
                      <li key={other.id} className="flex items-center gap-3 py-2.5">
                        {selectable && (
                          <input
                            type="checkbox"
                            checked={alsoClose.includes(other.id)}
                            onChange={() => toggleAlsoClose(other.id)}
                            aria-label={`Include ${other.id} in this decision`}
                            className="size-4 accent-brand"
                          />
                        )}
                        <Link
                          href={`/admin/reports/${other.id}`}
                          className="flex min-w-0 flex-1 flex-col gap-0.5 hover:opacity-80"
                        >
                          <span className="truncate text-xs font-bold text-white">
                            {other.reason}
                          </span>
                          <span className="truncate text-[11px] text-text-muted">
                            by {otherReporter?.username} · {formatAgo(other.createdAt)}
                          </span>
                        </Link>
                        <AdminBadge tone={otherStatus.tone}>{otherStatus.label}</AdminBadge>
                      </li>
                    );
                  })}
                </ul>
                {unresolved && otherReports.some(isUnresolved) && (
                  <p className="text-[11px] text-text-muted">
                    Tick unresolved reports to close them with the same decision.
                  </p>
                )}
              </>
            )}
          </AdminCard>
        </div>

        <div className="flex flex-col gap-4">
          {target && (
            <AdminCard title="Reported player">
              <div className="flex items-center gap-3">
                <Avatar src={target.avatar} size="lg" />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm font-bold text-white">
                    {target.username}
                  </span>
                  <AdminBadge tone={accountStatusMeta[accountStatus(target.id, sanctions)].tone}>
                    {accountStatusMeta[accountStatus(target.id, sanctions)].label}
                  </AdminBadge>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 border-t border-border-subtle pt-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[10px] uppercase tracking-wide text-text-muted">Reputation</dt>
                  <dd className="font-bold text-white">
                    {target.reputation?.toFixed(1) ?? "—"}
                    <span className="font-normal text-text-muted"> · {target.reviewCount} reviews</span>
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[10px] uppercase tracking-wide text-text-muted">Joined</dt>
                  <dd className="font-bold text-white">{formatDate(target.joinedAt)}</dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
                <span className="text-[10px] uppercase tracking-wide text-text-muted">
                  Sanction history
                </span>
                {targetSanctions.length === 0 ? (
                  <span className="text-xs text-text-muted">None</span>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {targetSanctions.map((sanction) => (
                      <li key={sanction.id} className="flex items-baseline justify-between gap-2 text-xs">
                        <span className={sanction.liftedAt ? "text-text-muted line-through" : "text-text-subtle"}>
                          {describeSanction(sanction)}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {formatAgo(sanction.issuedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Link href={`/admin/players/${target.id}`} className={adminButton.secondary}>
                Open player record
              </Link>
            </AdminCard>
          )}

          {reporter && credibility && (
            <AdminCard title="Reporter">
              <div className="flex items-center gap-3">
                <Avatar src={reporter.avatar} />
                <Link
                  href={`/admin/players/${reporter.id}`}
                  className="truncate text-xs font-bold text-white hover:text-brand"
                >
                  {reporter.username}
                </Link>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Filed", value: credibility.filed },
                  { label: "Actioned", value: credibility.upheld },
                  { label: "Dismissed", value: credibility.dismissed },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col rounded-lg bg-bg-page py-2">
                    <dd className="text-sm font-bold text-white">{stat.value}</dd>
                    <dt className="text-[10px] text-text-muted">{stat.label}</dt>
                  </div>
                ))}
              </dl>
              {credibility.flagged && (
                <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-warning">
                  Most of this player&apos;s decided reports were dismissed.
                  Weigh the evidence, not the report count.
                </p>
              )}
            </AdminCard>
          )}

          {report.resolution && (
            <AdminCard title="Decision">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-white">
                  {report.resolution.outcome === "dismissed"
                    ? "Dismissed, no action"
                    : linkedSanction
                      ? describeSanction(linkedSanction)
                      : "Sanction issued"}
                </span>
                <span className="text-[11px] text-text-muted">
                  {adminName(report.resolution.resolvedBy)} ·{" "}
                  {formatDateTime(report.resolution.resolvedAt)}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-text-subtle">
                {report.resolution.note}
              </p>
            </AdminCard>
          )}
        </div>
      </div>

      {modal === "dismiss" && (
        <ReasonModal
          title="Dismiss report"
          description="The report is closed with no action against the player. The reporter is told it was reviewed."
          label="Why no action"
          placeholder="e.g. Chat log shows no rule broken; disagreement over strategy."
          confirmLabel="Dismiss report"
          onConfirm={handleDismiss}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "sanction" && target && (
        <SanctionModal
          player={target}
          reportIds={[report.id, ...alsoClose]}
          defaultReason={report.reason}
          onClose={() => setModal(null)}
          onIssued={() => setAlsoClose([])}
        />
      )}
    </>
  );
}
