"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BackLink from "@/components/BackLink";
import ReportForm from "@/components/lobby/ReportForm";
import type { ReportSubmission, ReportTarget } from "@/data/lfg-lobby";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { submitReport } from "@/lib/reports";
import { createClient } from "@/lib/supabase/client";

interface ReportPlayerPanelProps {
  target: ReportTarget;
  game: string;
  /** Where Cancel and the post-submit "Done" go back to. */
  backHref: string;
  backLabel: string;
  lobbyId?: string;
  context?: string;
  /** A real player: the report is saved. Mock players only get the toast. */
  live?: boolean;
}

export default function ReportPlayerPanel({
  target,
  game,
  backHref,
  backLabel,
  lobbyId,
  context,
  live = false,
}: ReportPlayerPanelProps) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useNotifications();

  async function handleSubmit(report: ReportSubmission) {
    if (sending) return;
    if (live) {
      if (!user) {
        setError("Log in to report players.");
        return;
      }
      setSending(true);
      setError(null);
      const failure = await submitReport(createClient(), user.id, report);
      setSending(false);
      if (failure) {
        setError(failure);
        return;
      }
    }
    toast({
      tone: "success",
      title: "Report sent",
      body: `A moderator will review your report on ${target.name}.`,
    });
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink label={backLabel} href={backHref} />

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
              won&apos;t be notified of the outcome, and it doesn&apos;t change
              their rating.
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
          <div className="flex flex-col gap-3">
            <ReportForm
              player={target}
              game={game}
              lobbyId={lobbyId}
              context={context}
              onCancel={() => router.push(backHref)}
              onSubmit={handleSubmit}
            />
            {error && (
              <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
