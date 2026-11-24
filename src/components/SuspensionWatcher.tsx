"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

const CHECK_EVERY_MS = 60_000;

/**
 * Sends a player to /account-restricted as soon as a suspension starts, while
 * they have the app open. `proxy.ts` only sees full page loads, and moving
 * around by links isn't one, so without this a suspended player kept the whole
 * app until they refreshed (TC-140).
 *
 * Asks on every page change, on coming back to the tab, and once a minute.
 * Not through Realtime: that would publish `sanction` rows, moderator's note
 * included. An action tried in between is refused by the database
 * (`refuse_suspended`), and lib/supabase/client.ts leaves the page then too.
 *
 * /account-restricted itself ends the session and keeps the notice.
 */
export default function SuspensionWatcher() {
  const { user } = useAuth();
  const pathname = usePathname();
  const playerId = user?.role === "player" ? user.id : null;

  useEffect(() => {
    if (!playerId || pathname === "/account-restricted") return;
    let cancelled = false;

    async function check() {
      const { data, error } = await createClient().rpc("my_active_suspension");
      // Only on a definite yes: a failed read must not lock anyone out.
      if (cancelled || error || !Array.isArray(data) || data.length === 0) return;
      window.location.replace("/account-restricted");
    }

    function onVisible() {
      if (document.visibilityState === "visible") void check();
    }

    void check();
    const timer = setInterval(onVisible, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [playerId, pathname]);

  return null;
}
