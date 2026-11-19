"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthShell from "./AuthShell";
import UserAvatar from "@/components/UserAvatar";
import { loginPanel } from "@/data/auth";
import {
  RESTRICTION_NOTICE_KEY,
  restrictionCopy,
  type RestrictionNotice,
} from "@/data/account-restriction";
import { formatAgo, formatDateTime } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import { signOutIfSuspended } from "@/lib/suspension";

const secondaryButton =
  "flex h-11 items-center justify-center rounded-lg border border-border-strong text-sm font-semibold text-text-subtle transition-colors hover:border-white/30 hover:text-white";

export default function AccountRestricted() {
  // undefined = not read yet, null = nothing stored.
  const [notice, setNotice] = useState<RestrictionNotice | null | undefined>();

  useEffect(() => {
    let cancelled = false;
    const read = (): RestrictionNotice | null => {
      try {
        const raw = window.sessionStorage.getItem(RESTRICTION_NOTICE_KEY);
        return raw ? (JSON.parse(raw) as RestrictionNotice) : null;
      } catch {
        return null;
      }
    };
    // Sent here by the server (proxy.ts) with a session that was open when
    // the suspension began: end that session now and read the notice.
    void (async () => {
      let stored = read();
      if (!stored) {
        await signOutIfSuspended(createClient()).catch(() => false);
        stored = read();
      }
      if (!cancelled) setNotice(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (notice === undefined) return <div className="min-h-screen" />;

  if (!notice) {
    return (
      <AuthShell
        panel={loginPanel}
        title={restrictionCopy.missing.title}
        subtitle={restrictionCopy.missing.subtitle}
        panelVariant="solo"
      >
        <Link href="/login" className={secondaryButton}>
          Go to log in
        </Link>
      </AuthShell>
    );
  }

  const copy = restrictionCopy[notice.type];

  const details = [
    { label: "Rule broken", value: notice.reason },
    {
      label: "Started",
      value: formatDateTime(notice.issuedAt),
    },
    ...(notice.expiresAt
      ? [
          {
            label: "Ends",
            value: `${formatDateTime(notice.expiresAt)} (${formatAgo(notice.expiresAt)})`,
          },
        ]
      : []),
  ];

  return (
    <AuthShell
      panel={loginPanel}
      title={copy.title}
      subtitle={copy.subtitle}
      panelVariant="solo"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-page px-3 py-2.5">
        <UserAvatar
          src={notice.avatar}
          name={notice.username}
          className="size-9 shrink-0 grayscale"
        />
        <span className="flex-1 truncate text-sm font-bold text-white">
          {notice.username}
        </span>
        <span
          className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning"
        >
          Suspended
        </span>
      </div>

      <dl className="flex flex-col gap-2.5 text-xs">
        {details.map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <dt className="shrink-0 text-text-muted">{row.label}</dt>
            <dd className="text-right font-semibold text-white">{row.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="flex flex-col gap-1.5 border-t border-border-subtle pt-4 text-xs leading-relaxed text-text-muted">
        {copy.effects.map((effect) => (
          <li key={effect}>{effect}</li>
        ))}
        <li className="text-text-subtle">{copy.next}</li>
      </ul>

      <Link href="/login" className={secondaryButton}>
        Log in with another account
      </Link>
    </AuthShell>
  );
}
