"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Mirrors `role` / `user_role_mapping` in the ERD. Admins are separate staff
 * accounts, not players with an extra flag — see docs/admin-console.md.
 */
export type AccountRole = "player" | "admin";

export interface AuthUser {
  name: string;
  avatar: string;
  profileHref: string;
  /** Missing on sessions stored before roles existed — treat as "player". */
  role?: AccountRole;
  /** Admin account id, used to attribute moderation actions. */
  id?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /**
   * False until the stored session has been read. Guards must wait for this:
   * on the first render `user` is always null, even for someone signed in.
   */
  isReady: boolean;
  isAdmin: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "temangame:auth-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Frontend-only session mock — TODO: replace with a real Supabase session
  // check once the backend exists. Persisting to localStorage just lets the
  // logged-in state survive a page reload/navigation in the meantime.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        // Deliberately synchronous: this only runs once on mount to hydrate
        // client-only localStorage state, which can't be read during SSR.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(JSON.parse(stored) as AuthUser);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsReady(true);
  }, []);

  function login(nextUser: AuthUser) {
    setUser(nextUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  }

  function logout() {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, isReady, isAdmin, login, logout }}>
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
