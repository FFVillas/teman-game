"use client";

import { useState } from "react";
import { promptInstall, useInstallState } from "@/lib/pwa";

/**
 * The body of the "App" card in Settings: install TemanGame to the home
 * screen, or how to on an iPhone, or that it already is.
 */
export default function InstallAppCard() {
  const state = useInstallState();
  const [busy, setBusy] = useState(false);

  if (state === "installed") {
    return (
      <p className="flex items-center gap-2 text-xs text-success">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Installed. Open TemanGame from your home screen or app list.
      </p>
    );
  }

  if (state === "prompt") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await promptInstall();
          setBusy(false);
        }}
        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-brand text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <DownloadIcon />
        Install TemanGame
      </button>
    );
  }

  if (state === "ios") {
    return (
      <ol className="flex flex-col gap-2 text-xs text-text-subtle">
        <li className="flex items-center gap-2">
          <Step n={1} />
          <span>
            Tap <ShareIcon /> <span className="font-semibold text-white">Share</span> in Safari&apos;s toolbar.
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Step n={2} />
          <span>
            Choose <span className="font-semibold text-white">Add to Home Screen</span>.
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Step n={3} />
          <span>Open TemanGame from your home screen.</span>
        </li>
      </ol>
    );
  }

  return (
    <p className="text-[11px] leading-relaxed text-text-muted">
      This browser can&apos;t install apps. Open TemanGame in Chrome or Edge, or
      in Safari on an iPhone.
    </p>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
      {n}
    </span>
  );
}

export function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.5v8M4.5 7.5 8 11l3.5-3.5M3 13.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-label="Share icon" className="inline -translate-y-px">
      <path d="M8 10V2M5 4.5 8 1.5l3 3M4.5 7H3.5v7.5h9V7h-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
