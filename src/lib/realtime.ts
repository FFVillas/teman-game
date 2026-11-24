"use client";

import { useEffect, useId } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Live row inserts from Supabase Realtime.
 *
 * Two things make this work, and both are easy to miss:
 *
 * 1. The table has to be published:
 *    `alter publication supabase_realtime add table public.<table>;`
 * 2. **The socket has to carry the user's token.** Realtime applies the same
 *    RLS as a normal query, and an un-authenticated socket is `anon` — which
 *    can't read `direct_messages` or `notifications` at all, so events are
 *    silently dropped. The subscription still reports SUBSCRIBED, so this
 *    fails as "nothing ever arrives" rather than as an error.
 *
 * Everything degrades safely: if the socket never connects, each screen
 * still shows what it loaded on page load.
 *
 * Each caller gets its own channel name. Supabase looks channels up by
 * topic, so two components listening to the same table and filter would
 * otherwise land on one channel — and the second `.on()` throws "cannot add
 * postgres_changes callbacks after subscribe()". The messages page and the
 * navbar badge do exactly that.
 */
export function useRealtimeInserts<T extends Record<string, unknown>>({
  table,
  filter,
  enabled = true,
  onInsert,
}: {
  table: string;
  /** PostgREST filter, e.g. `receiver_id=eq.<uuid>`. */
  filter?: string;
  enabled?: boolean;
  onInsert: (row: T) => void;
}) {
  useRealtimeTable<T>({
    event: "INSERT",
    table,
    filter,
    enabled,
    onEvent: onInsert,
  });
}

/**
 * Any change (insert, update or delete) to the rows of a table. For screens
 * that only need to know "something changed, load it again" (a roster, a
 * lobby list): the caller refetches rather than patching state from the row.
 */
export function useRealtimeChanges({
  table,
  filter,
  enabled = true,
  onChange,
}: {
  table: string;
  filter?: string;
  enabled?: boolean;
  onChange: () => void;
}) {
  useRealtimeTable<Record<string, unknown>>({
    event: "*",
    table,
    filter,
    enabled,
    onEvent: () => onChange(),
  });
}

/**
 * Rows deleted from a table, as `{ id }` (the primary key is all Realtime
 * sends for a delete under RLS). Supabase can't filter delete events (the row
 * is gone, so neither the filter nor RLS can be checked), so this listens to
 * the whole table: the caller checks whether the id is one it shows.
 */
export function useRealtimeDeletes({
  table,
  enabled = true,
  onDelete,
}: {
  table: string;
  enabled?: boolean;
  onDelete: (row: { id?: string }) => void;
}) {
  useRealtimeTable<{ id?: string }>({
    event: "DELETE",
    table,
    enabled,
    onEvent: onDelete,
  });
}

function useRealtimeTable<T extends Record<string, unknown>>({
  event,
  table,
  filter,
  enabled,
  onEvent,
}: {
  event: "INSERT" | "DELETE" | "*";
  table: string;
  filter?: string;
  enabled: boolean;
  onEvent: (row: T) => void;
}) {
  const instanceId = useId();

  useEffect(() => {
    if (!enabled) return;

    const supabase: SupabaseClient = createClient();
    let channel: ReturnType<SupabaseClient["channel"]> | null = null;
    let cancelled = false;

    async function subscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      await supabase.realtime.setAuth(session.access_token);
      if (cancelled) return;

      channel = supabase
        .channel(`${table}:${event}:${filter ?? "all"}:${instanceId}`)
        .on(
          "postgres_changes",
          { event, schema: "public", table, filter },
          (payload) =>
            onEvent((event === "DELETE" ? payload.old : payload.new) as T),
        )
        .subscribe();
    }

    subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // `onEvent` is intentionally not a dependency: callers pass an inline
    // closure, and re-subscribing on every render would churn the socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, table, filter, enabled, instanceId]);
}
