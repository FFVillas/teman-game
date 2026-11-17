"use client";

import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { filtersToQuery, type LobbyFilters } from "@/lib/lobby-filters";

/**
 * Changes the LFG list's filters by changing the URL; the server reads it and
 * sends back the filtered, ranked list. `replace` rather than `push`, so the
 * back button leaves the page instead of stepping through every filter tried.
 */
export function useLobbyFilters(current: LobbyFilters) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  // A delayed apply (the search box) must build on the filters as they are
  // then, not as they were when the timer started.
  const latest = useRef(current);
  useEffect(() => {
    latest.current = current;
  }, [current]);

  function apply(changes: Partial<LobbyFilters>) {
    const next = { ...latest.current, ...changes };
    startTransition(() => {
      router.replace(`${pathname}${filtersToQuery(next)}`, { scroll: false });
    });
  }

  return { apply, isPending };
}
