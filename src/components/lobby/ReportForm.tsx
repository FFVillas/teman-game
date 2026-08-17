"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  reportReasons,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_ACCEPT,
  type LobbyMember,
  type ReportSubmission,
} from "@/data/lfg-lobby";

const MIN_DETAIL_LENGTH = 20;

interface ReportFormProps {
  player: LobbyMember;
  game: string;
  onCancel: () => void;
  onSubmit: (report: ReportSubmission) => void;
}

/**
 * Report ticket, shaped by what a moderator needs to act without going back
 * to the reporter: a category, a written account, and evidence. Used inside
 * the post-lobby rating queue; also standalone-ready.
 */
export default function ReportForm({
  player,
  game,
  onCancel,
  onSubmit,
}: ReportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [file, setFile] = useState<File>();
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [errors, setErrors] = useState<{
    reason?: string;
    details?: string;
    file?: string;
  }>({});

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (!picked) return;

    if (picked.size > EVIDENCE_MAX_BYTES) {
      setErrors((prev) => ({ ...prev, file: "That file is over the 5MB limit." }));
      setFile(undefined);
      event.target.value = "";
      return;
    }
    setErrors((prev) => ({ ...prev, file: undefined }));
    setFile(picked);
  }

  function handleSubmit() {
    const nextErrors: typeof errors = {};
    if (!reason) nextErrors.reason = "Pick a reason.";
    if (details.trim().length < MIN_DETAIL_LENGTH) {
      nextErrors.details = `Give the moderator a bit more to go on — at least ${MIN_DETAIL_LENGTH} characters.`;
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      targetId: player.id,
      reason,
      details: details.trim(),
      evidenceFileName: file?.name,
      evidenceUrl: evidenceUrl.trim() || undefined,
    });
  }

  const labelClass =
    "text-[11px] font-bold uppercase tracking-widest text-text-muted";
  const controlClass =
    "w-full rounded-lg border bg-bg-page px-3 py-2.5 text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-1";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-white">Report player</h3>
        <p className="text-[11px] leading-relaxed text-text-muted">
          Help keep the community safe by reporting violations of the Code of
          Conduct. Reports go to a moderator — they don&apos;t change this
          player&apos;s rating on their own.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-page p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- avatar thumbnail, no benefit from next/image optimization */}
        <img
          src={player.avatar}
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-bold text-white">
            {player.name}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <span className="capitalize">{game}</span>
            <span>•</span>
            <span className={`font-bold ${player.rank.colorClass}`}>
              {player.rank.name}
            </span>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-danger/15 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-danger">
          Reported user
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-reason" className={labelClass}>
          Reason for report
        </label>
        <div className="relative">
          <select
            id="report-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setErrors((prev) => ({ ...prev, reason: undefined }));
            }}
            aria-invalid={errors.reason ? true : undefined}
            className={`${controlClass} appearance-none pr-9 ${
              errors.reason
                ? "border-danger focus:ring-danger"
                : "border-border-strong focus:ring-brand"
            }`}
          >
            <option value="">Select a reason...</option>
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
        {errors.reason && (
          <p className="text-[11px] text-danger">{errors.reason}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-details" className={labelClass}>
          Additional details
        </label>
        <textarea
          id="report-details"
          value={details}
          onChange={(event) => {
            setDetails(event.target.value);
            setErrors((prev) => ({ ...prev, details: undefined }));
          }}
          rows={4}
          placeholder="What happened? Include roughly when it happened and anything a moderator would need to verify it."
          aria-invalid={errors.details ? true : undefined}
          className={`${controlClass} resize-none leading-relaxed ${
            errors.details
              ? "border-danger focus:ring-danger"
              : "border-border-strong focus:ring-brand"
          }`}
        />
        {errors.details ? (
          <p className="text-[11px] text-danger">{errors.details}</p>
        ) : (
          <p className="text-[11px] text-text-muted">
            {details.trim().length}/{MIN_DETAIL_LENGTH} characters minimum
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Attach evidence (optional)</span>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong px-4 py-5 transition-colors hover:border-white/30"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img
            src="/icons/lfg-settings-sliders.svg"
            alt=""
            className="size-4 opacity-50"
          />
          <span className="text-[11px] text-text-subtle">
            {file ? file.name : "Click to upload a screenshot or clip"}
          </span>
          <span className="text-[10px] text-text-muted">
            Max size 5MB (PNG, JPG, MP4)
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={EVIDENCE_ACCEPT}
          onChange={handleFile}
          className="hidden"
          aria-label="Attach evidence"
        />
        {errors.file && <p className="text-[11px] text-danger">{errors.file}</p>}

        <input
          value={evidenceUrl}
          onChange={(event) => setEvidenceUrl(event.target.value)}
          placeholder="Or paste a video link (Twitch, YouTube, Streamable)"
          aria-label="Evidence video link"
          className={`${controlClass} border-border-strong focus:ring-brand`}
        />
      </div>

      <div className="flex items-center gap-3 border-t border-border-subtle pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border-strong text-xs font-semibold text-text-muted transition-colors hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex h-10 flex-1 items-center justify-center rounded-lg bg-danger text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          Submit report
        </button>
      </div>
    </div>
  );
}
