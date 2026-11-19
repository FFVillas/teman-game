"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { evidenceLink } from "@/lib/admin-data";

/**
 * A report's evidence file. It lives in the private `report-evidence` bucket,
 * so opening it asks for a link that works for five minutes.
 */
export default function EvidenceFile({ reportId, fileName }: { reportId: string; fileName: string }) {
  const [state, setState] = useState<"idle" | "opening" | "missing">("idle");

  async function open() {
    setState("opening");
    // Opened before the await, so the browser doesn't treat it as a pop-up.
    const tab = window.open("", "_blank");
    const url = await evidenceLink(createClient(), reportId);
    if (url && tab) {
      tab.location.href = url;
      setState("idle");
    } else {
      tab?.close();
      setState("missing");
    }
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border-default bg-bg-page px-3 py-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
      <img src="/icons/admin-attachment.svg" alt="" className="size-4 opacity-70" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-semibold text-white">{fileName}</span>
        <span className="text-[11px] text-text-muted">
          {state === "missing" ? "The file couldn't be opened." : "Private: only you and the reporter can open it."}
        </span>
      </div>
      <button
        type="button"
        onClick={open}
        disabled={state === "opening"}
        className="shrink-0 rounded-lg border border-border-strong px-3 py-1.5 text-[11px] font-semibold text-text-subtle transition-colors hover:text-white disabled:opacity-60"
      >
        {state === "opening" ? "Opening…" : "Open"}
      </button>
    </div>
  );
}
