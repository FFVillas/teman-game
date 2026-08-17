"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReportForm from "@/components/lobby/ReportForm";
import type { ReportSubmission, ReportTarget } from "@/data/lfg-lobby";

interface ReportPlayerPanelProps {
  target: ReportTarget;
  game: string;
  /** Where Cancel and the post-submit "Done" go back to. */
  backHref: string;
  backLabel: string;
  lobbyId?: string;
  context?: string;
}

export default function ReportPlayerPanel({
  target,
  game,
  backHref,
  backLabel,
  lobbyId,
  context,
}: ReportPlayerPanelProps) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(report: ReportSubmission) {
    // TODO: POST to `reports`, opening a moderation ticket for an admin.
    void report;
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={backHref}
        className="flex w-fit items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/lfg-back-arrow.svg" alt="" className="size-4" />
        {backLabel}
      </Link>

      <div className="mx-auto w-full max-w-[560px] rounded-2xl border border-border-strong bg-bg-card-alt p-6">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-success/15">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/auth-check.svg" alt="" className="size-5" />
            </div>
            <h1 className="text-lg font-bold text-white">Report submitted</h1>
            <p className="max-w-[380px] text-xs leading-relaxed text-text-muted">
              A moderator will review your report on {target.name}. You
              won&apos;t be notified of the outcome, but repeated reports
              against the same player are weighted together.
            </p>
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="mt-2 flex h-10 items-center justify-center rounded-lg bg-brand px-6 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <ReportForm
            player={target}
            game={game}
            lobbyId={lobbyId}
            context={context}
            onCancel={() => router.push(backHref)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
