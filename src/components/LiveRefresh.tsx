"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeChanges } from "@/lib/realtime";

export interface LiveSubscription {
  table: string;
  /** PostgREST filter, e.g. `lobby_id=eq.<uuid>`. */
  filter?: string;
}

/**
 * Re-renders the page (a Server Component that loaded its data) whenever
 * something it shows changes in the database, so a roster, a request list or
 * a lobby list stays current without a reload. Put it on a page and list the
 * tables and rows that matter.
 *
 * Two things keep it cheap: a burst of changes (an accept writes several
 * rows) becomes one refresh, and nothing refreshes while the tab is hidden;
 * the page catches up when you come back to it.
 *
 * Only for signed-in visitors: the realtime socket needs a session, so a
 * signed-out page simply doesn't update live.
 */
export default function LiveRefresh({
  subscriptions,
  enabled = true,
  delayMs = 700,
}: {
  subscriptions: LiveSubscription[];
  enabled?: boolean;
  delayMs?: number;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missed = useRef(false);

  const refresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      } else {
        missed.current = true;
      }
    }, delayMs);
  }, [router, delayMs]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && missed.current) {
        missed.current = false;
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);

  return (
    <>
      {subscriptions.map((subscription) => (
        <Subscription
          key={`${subscription.table}:${subscription.filter ?? ""}`}
          {...subscription}
          enabled={enabled}
          onChange={refresh}
        />
      ))}
    </>
  );
}

// One hook per subscription, so the list can have any length.
function Subscription({
  table,
  filter,
  enabled,
  onChange,
}: LiveSubscription & { enabled: boolean; onChange: () => void }) {
  useRealtimeChanges({ table, filter, enabled, onChange });
  return null;
}
