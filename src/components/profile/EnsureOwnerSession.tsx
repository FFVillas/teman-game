"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { PlayerProfile } from "@/data/player-profiles";

/**
 * Visiting "my profile" directly (without going through the login/signup
 * form first) should still show the logged-in navbar — this is a frontend-only
 * mock, so there's no real session to check, we just establish one here.
 *
 * Runs at most once per mount (via the ref guard), not every time `user`
 * changes — otherwise clicking Logout while still on this page would
 * immediately re-trigger this effect and undo the logout.
 */
export default function EnsureOwnerSession({
  profile,
}: {
  profile: PlayerProfile;
}) {
  const { user, login } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    if (user) return;
    login({
      name: profile.username,
      avatar: profile.avatar,
      profileHref: "/profile/me",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
