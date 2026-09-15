"use client";

import { useState, type FormEvent } from "react";
import {
  MIN_ADMIN_NOTE_LENGTH,
  reportReasons,
  sanctionLabels,
  suspensionDurations,
  type AdminPlayer,
  type SanctionType,
} from "@/data/admin-moderation";
import { useAdminData } from "@/contexts/AdminDataContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { describeSanction, suggestedSanction } from "@/lib/admin";
import { AdminModal, NoteField } from "./AdminModal";
import { Avatar, adminButton, adminFieldClass } from "./AdminUi";

const sanctionTypes: { type: SanctionType; hint: string }[] = [
  { type: "warning", hint: "Recorded, no restriction" },
  { type: "suspension", hint: "Can't log in until it ends" },
  { type: "ban", hint: "Account closed permanently" },
];

interface SanctionModalProps {
  player: AdminPlayer;
  /** Reports this decision closes. Empty when acting from the player record. */
  reportIds: string[];
  defaultReason?: string;
  onClose: () => void;
  onIssued?: () => void;
}

export default function SanctionModal({
  player,
  reportIds,
  defaultReason,
  onClose,
  onIssued,
}: SanctionModalProps) {
  const { sanctions, issueSanction } = useAdminData();
  const { toast } = useNotifications();
  const suggestion = suggestedSanction(player.id, sanctions);

  const [type, setType] = useState<SanctionType>(suggestion.type);
  const [durationDays, setDurationDays] = useState<number>(
    suggestion.durationDays ?? 7
  );
  const [reason, setReason] = useState(defaultReason ?? reportReasons[0]);
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);

  const summary = describeSanction({ type, durationDays });
  const confirmLabel =
    type === "warning"
      ? "Issue warning"
      : type === "suspension"
        ? `Suspend for ${durationDays} day${durationDays === 1 ? "" : "s"}`
        : "Ban permanently";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (note.trim().length < MIN_ADMIN_NOTE_LENGTH) return;

    issueSanction({
      playerId: player.id,
      type,
      durationDays: type === "suspension" ? durationDays : undefined,
      reason,
      note: note.trim(),
      reportIds,
    });
    toast({
      tone: "success",
      title: `${summary} issued to ${player.username}`,
      body:
        reportIds.length > 0
          ? `${reportIds.length} report${reportIds.length === 1 ? "" : "s"} closed as actioned.`
          : "Logged to the audit trail.",
    });
    onIssued?.();
    onClose();
  }

  return (
    <AdminModal
      title="Take action"
      description={
        reportIds.length > 0
          ? `This closes ${reportIds.length} report${reportIds.length === 1 ? "" : "s"} against ${player.username} as actioned.`
          : `Issued directly from ${player.username}'s record, not tied to a report.`
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-page px-3 py-2.5">
          <Avatar src={player.avatar} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-bold text-white">
              {player.username}
            </span>
            <span className="text-[11px] text-text-muted">
              Suggested: {describeSanction(suggestion)} · {suggestion.because}
            </span>
          </div>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="pb-1.5 text-[11px] font-bold uppercase tracking-widest text-text-muted">
            Sanction
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {sanctionTypes.map((option) => {
              const selected = option.type === type;
              const isBan = option.type === "ban";
              return (
                <button
                  key={option.type}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setType(option.type)}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? isBan
                        ? "border-danger/60 bg-danger/10"
                        : "border-brand/60 bg-brand/10"
                      : "border-border-default hover:border-border-strong"
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      selected ? (isBan ? "text-danger" : "text-white") : "text-text-subtle"
                    }`}
                  >
                    {sanctionLabels[option.type]}
                  </span>
                  <span className="text-[10px] text-text-muted">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {type === "suspension" && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="pb-1.5 text-[11px] font-bold uppercase tracking-widest text-text-muted">
              Duration
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {suspensionDurations.map((days) => {
                const selected = days === durationDays;
                return (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDurationDays(days)}
                    className={`flex h-8 items-center rounded-lg border px-3 text-xs font-semibold transition-colors ${
                      selected
                        ? "border-brand/60 bg-brand/10 text-white"
                        : "border-border-default text-text-muted hover:text-white"
                    }`}
                  >
                    {days} day{days === 1 ? "" : "s"}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
            Rule broken
          </span>
          <div className="relative">
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={`${adminFieldClass} h-10 appearance-none pr-9`}
            >
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
          <span className="text-[11px] text-text-muted">
            The player sees this rule, never who reported them.
          </span>
        </label>

        <NoteField
          label="Internal note"
          value={note}
          onChange={setNote}
          placeholder="What you checked and why this sanction fits, e.g. chat log lines, evidence reviewed."
          hint="Only admins see this. Saved to the audit log."
          showError={attempted}
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={adminButton.secondary}>
            Cancel
          </button>
          <button
            type="submit"
            className={type === "ban" ? adminButton.danger : adminButton.primary}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
