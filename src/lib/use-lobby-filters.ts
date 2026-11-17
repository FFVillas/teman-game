"use client";

import { useTransition } from "react";
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

  function apply(changes: Partial<LobbyFilters>) {
    const next = { ...current, ...changes };
    startTransition(() => {
      router.replace(`${pathname}${filtersToQuery(next)}`, { scroll: false });
    });
  }

  return { apply, isPending };
}
