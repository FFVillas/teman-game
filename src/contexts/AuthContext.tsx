"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * DIVERGENCE FROM PROPOSAL: the ERD models admin via `role` +
 * `user_role_mapping` — an admin is a user account that also holds the
 * "admin" role. This app doesn't build that. Admin identity lives in its
 * own `admins` table (supabase/migrations/20260919000100_admin_roles.sql),
 * entirely independent of `profiles` — see docs/thesis-spec.md's
 * "Divergences from the proposal" section for the reasoning. Whether an
 * account is a "player" or "admin" here is determined by which table has
 * a row for it, not by a role column.
 */
export type AccountRole = "player" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  avatar: string;
  profileHref: string;
  role: AccountRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  /**
   * False until the initial session check has resolved. Guards must wait
   * for this: on the first render `user` is always null, even for someone
   * with a valid session — reading it early would flash a logged-out UI.
   */
  isReady: boolean;
  isAdmin: boolean;
  logout: () => void;
  /**
   * Re-reads the profile row into `user`. Call after something that changes
   * what the navbar shows (username, avatar) — onAuthStateChange only fires
   * for session changes, not for edits to `profiles`.
   */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Figures out whether a signed-in Supabase user is staff or a player, and
 * builds the shape the rest of the app reads. Checks `admins` first —
 * RLS on that table only lets an actual admin see rows in it at all (see
 * the migration), so a non-admin's query here simply comes back empty
 * rather than needing a separate permission error to handle.
 */
async function buildAuthUser(
  supabase: ReturnType<typeof createClient>,
  authUser: User,
): Promise<AuthUser> {
  const { data: admin } = await supabase
    .from("admins")
    .select("display_name")
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (admin) {
    return {
      id: authUser.id,
      name: admin.display_name,
      avatar: "",
      profileHref: "/admin",
      role: "admin",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", authUser.id)
    .maybeSingle();

  return {
    id: authUser.id,
    name: profile?.username ?? authUser.email ?? "Player",
    avatar: profile?.avatar_url ?? "",
    profileHref: "/profile/me",
    role: "player",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      if (data.user) {
        setUser(await buildAuthUser(supabase, data.user));
      }
      setIsReady(true);
    });

    // Keeps `user` in sync with sign-in/sign-out/token refresh happening
    // anywhere else in the app (another tab, a Server Action, expiry) —
    // components never call a "login" setter directly, this listener is
    // the only thing that writes `user`.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      setUser(session?.user ? await buildAuthUser(supabase, session.user) : null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  function logout() {
    const supabase = createClient();
    supabase.auth.signOut();
    // onAuthStateChange fires from this too, but setting it here as well
    // means the UI updates immediately rather than waiting a round trip.
    setUser(null);
  }

  async function refreshUser() {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    setUser(data.user ? await buildAuthUser(supabase, data.user) : null);
  }

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, isReady, isAdmin, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
