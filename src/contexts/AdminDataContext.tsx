"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AdminData, SanctionType } from "@/data/admin-moderation";
import { createClient } from "@/lib/supabase/client";
import { adminErrorMessage, fetchAdminData } from "@/lib/admin-data";

export interface IssueSanctionInput {
  playerId: string;
  type: SanctionType;
  durationDays?: number;
  reason: string;
  note: string;
  /** Reports this sanction closes. Empty when issued from a player record. */
  reportIds: string[];
}

/** Each action resolves to null when it saved, or the reason it didn't. */
type Result = Promise<string | null>;

interface AdminDataContextValue extends AdminData {
  claimReport: (reportId: string) => Result;
  dismissReport: (reportId: string, note: string) => Result;
  issueSanction: (input: IssueSanctionInput) => Result;
  liftSanction: (sanctionId: string, reason: string) => Result;
  closeLobby: (lobbyId: string, reason: string) => Result;
  removeLobbyMember: (lobbyId: string, playerId: string, reason: string) => Result;
  /** Re-reads everything, e.g. after another moderator acted. */
  reload: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextValue | undefined>(undefined);

/**
 * The moderation data for /admin, read from Supabase (`lib/admin-data.ts`).
 * Every action is a database function that checks the caller is an admin,
 * requires a reason and writes the audit log entry in the same transaction
 * (`20261119000200_admin_moderation.sql`); afterwards everything is re-read,
 * so the screens always show what the database holds.
 */
export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await fetchAdminData(createClient()));
      setLoadError(null);
    } catch (error) {
      // Loading isn't saving: say what failed, so a missing migration
      // ("function admin_accounts does not exist") is obvious.
      const detail = (error as { message?: string })?.message ?? "";
      setLoadError(
        detail.includes("does not exist") || detail.includes("Could not find")
          ? "The moderation functions aren't in the database yet. Run migration 20261119000200_admin_moderation.sql, then reload."
          : `Couldn't load moderation data. ${detail}`.trim(),
      );
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first load of external data
    void reload();
  }, [reload]);

  const run = useCallback(
    async (fn: string, args: Record<string, unknown>): Result => {
      const { error } = await createClient().rpc(fn, args);
      if (error) return adminErrorMessage(error);
      await reload();
      return null;
    },
    [reload],
  );

  if (!data) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center bg-bg-page px-6 text-center">
        <p className="text-sm text-text-muted">
          {loadError ?? "Loading moderation data…"}
        </p>
      </div>
    );
  }

  return (
    <AdminDataContext.Provider
      value={{
        ...data,
        reload,
        claimReport: (reportId) => run("admin_claim_report", { p_report: reportId }),
        dismissReport: (reportId, note) =>
          run("admin_dismiss_report", { p_report: reportId, p_note: note }),
        issueSanction: (input) =>
          run("admin_issue_sanction", {
            p_player: input.playerId,
            p_type: input.type,
            p_duration_days: input.type === "suspension" ? (input.durationDays ?? null) : null,
            p_reason: input.reason,
            p_note: input.note,
            p_report_ids: input.reportIds,
          }),
        liftSanction: (sanctionId, reason) =>
          run("admin_lift_sanction", { p_sanction: sanctionId, p_reason: reason }),
        closeLobby: (lobbyId, reason) =>
          run("admin_close_lobby", { p_lobby: lobbyId, p_reason: reason }),
        removeLobbyMember: (lobbyId, playerId, reason) =>
          run("admin_remove_member", { p_lobby: lobbyId, p_player: playerId, p_reason: reason }),
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error("useAdminData must be used within an AdminDataProvider");
  }
  return context;
}
