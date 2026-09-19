"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  createSeedAdminData,
  type AdminAction,
  type AdminData,
  type Sanction,
  type SanctionType,
} from "@/data/admin-moderation";
import { describeSanction } from "@/lib/admin";
import { ADMIN_STORAGE_KEY } from "@/lib/admin-store";

export interface IssueSanctionInput {
  playerId: string;
  type: SanctionType;
  durationDays?: number;
  reason: string;
  note: string;
  /** Reports this sanction closes. Empty when issued from a player record. */
  reportIds: string[];
}

interface AdminDataContextValue extends AdminData {
  claimReport: (reportId: string) => void;
  dismissReport: (reportId: string, note: string) => void;
  issueSanction: (input: IssueSanctionInput) => Sanction;
  liftSanction: (sanctionId: string, reason: string) => void;
  closeLobby: (lobbyId: string, reason: string) => void;
  removeLobbyMember: (lobbyId: string, playerId: string, reason: string) => void;
}

const AdminDataContext = createContext<AdminDataContextValue | undefined>(
  undefined
);

const STORAGE_KEY = ADMIN_STORAGE_KEY;

/**
 * Frontend-only stand-in for the moderation API. Every mutation here is one
 * server call later (and one RLS-protected write); each also appends to the
 * audit log, which in the database should happen in the same transaction.
 */
export function AdminDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const adminId = user?.id ?? "adm-1";
  const [data, setData] = useState<AdminData>(createSeedAdminData);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(JSON.parse(stored) as AdminData);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const update = useCallback((recipe: (prev: AdminData) => AdminData) => {
    setData((prev) => {
      const next = recipe(prev);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const logAction = useCallback(
    (action: Omit<AdminAction, "id" | "adminId" | "at">): AdminAction => ({
      ...action,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      adminId,
      at: new Date().toISOString(),
    }),
    [adminId]
  );

  const claimReport = useCallback(
    (reportId: string) => {
      update((prev) => ({
        ...prev,
        reports: prev.reports.map((report) =>
          report.id === reportId
            ? { ...report, status: "in_review", assignedTo: adminId }
            : report
        ),
        actions: [
          logAction({
            type: "report_claimed",
            targetType: "report",
            targetId: reportId,
            summary: "Claimed report",
            reason: "",
          }),
          ...prev.actions,
        ],
      }));
    },
    [adminId, logAction, update]
  );

  const dismissReport = useCallback(
    (reportId: string, note: string) => {
      const now = new Date().toISOString();
      update((prev) => ({
        ...prev,
        reports: prev.reports.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status: "dismissed",
                assignedTo: report.assignedTo ?? adminId,
                resolution: {
                  outcome: "dismissed",
                  note,
                  resolvedBy: adminId,
                  resolvedAt: now,
                },
              }
            : report
        ),
        actions: [
          logAction({
            type: "report_dismissed",
            targetType: "report",
            targetId: reportId,
            summary: "Dismissed report",
            reason: note,
          }),
          ...prev.actions,
        ],
      }));
    },
    [adminId, logAction, update]
  );

  const issueSanction = useCallback(
    (input: IssueSanctionInput): Sanction => {
      const issuedAt = new Date();
      const sanction: Sanction = {
        id: `san-${issuedAt.getTime()}`,
        playerId: input.playerId,
        type: input.type,
        durationDays: input.type === "suspension" ? input.durationDays : undefined,
        reason: input.reason,
        note: input.note,
        reportIds: input.reportIds,
        issuedBy: adminId,
        issuedAt: issuedAt.toISOString(),
        expiresAt:
          input.type === "suspension" && input.durationDays
            ? new Date(
                issuedAt.getTime() + input.durationDays * 24 * 60 * 60 * 1000
              ).toISOString()
            : undefined,
      };

      update((prev) => ({
        ...prev,
        sanctions: [sanction, ...prev.sanctions],
        reports: prev.reports.map((report) =>
          input.reportIds.includes(report.id)
            ? {
                ...report,
                status: "resolved",
                assignedTo: report.assignedTo ?? adminId,
                resolution: {
                  outcome: "sanctioned",
                  sanctionId: sanction.id,
                  note: input.note,
                  resolvedBy: adminId,
                  resolvedAt: sanction.issuedAt,
                },
              }
            : report
        ),
        actions: [
          logAction({
            type: "sanction_issued",
            targetType: "player",
            targetId: input.playerId,
            summary: describeSanction(sanction),
            reason: input.note,
          }),
          ...prev.actions,
        ],
      }));

      // TODO: notify the player (FCM) and, for suspensions and bans, revoke
      // their active sessions server-side.
      return sanction;
    },
    [adminId, logAction, update]
  );

  const liftSanction = useCallback(
    (sanctionId: string, reason: string) => {
      update((prev) => {
        const sanction = prev.sanctions.find((s) => s.id === sanctionId);
        if (!sanction) return prev;
        return {
          ...prev,
          sanctions: prev.sanctions.map((s) =>
            s.id === sanctionId
              ? {
                  ...s,
                  liftedAt: new Date().toISOString(),
                  liftedBy: adminId,
                  liftReason: reason,
                }
              : s
          ),
          actions: [
            logAction({
              type: "sanction_lifted",
              targetType: "player",
              targetId: sanction.playerId,
              summary: `Lifted ${describeSanction(sanction).toLowerCase()}`,
              reason,
            }),
            ...prev.actions,
          ],
        };
      });
    },
    [adminId, logAction, update]
  );

  const closeLobby = useCallback(
    (lobbyId: string, reason: string) => {
      update((prev) => ({
        ...prev,
        lobbies: prev.lobbies.map((lobby) =>
          lobby.id === lobbyId
            ? {
                ...lobby,
                status: "closed",
                closedAt: new Date().toISOString(),
                closedBy: adminId,
                closedReason: reason,
              }
            : lobby
        ),
        actions: [
          logAction({
            type: "lobby_closed",
            targetType: "lobby",
            targetId: lobbyId,
            summary: "Closed lobby",
            reason,
          }),
          ...prev.actions,
        ],
      }));
      // TODO: notify every member that the lobby was closed by a moderator.
    },
    [adminId, logAction, update]
  );

  const removeLobbyMember = useCallback(
    (lobbyId: string, playerId: string, reason: string) => {
      update((prev) => {
        const player = prev.players.find((p) => p.id === playerId);
        return {
          ...prev,
          lobbies: prev.lobbies.map((lobby) =>
            lobby.id === lobbyId
              ? {
                  ...lobby,
                  memberIds: lobby.memberIds.filter((id) => id !== playerId),
                  messages: [
                    ...lobby.messages,
                    {
                      id: `sys-${Date.now()}`,
                      authorId: "system",
                      authorName: "System",
                      body: `${player?.username ?? "A player"} was removed by a moderator`,
                      sentAt: "now",
                      isSystem: true,
                    },
                  ],
                }
              : lobby
          ),
          actions: [
            logAction({
              type: "member_removed",
              targetType: "lobby",
              targetId: lobbyId,
              summary: `Removed ${player?.username ?? playerId}`,
              reason,
            }),
            ...prev.actions,
          ],
        };
      });
    },
    [logAction, update]
  );

  return (
    <AdminDataContext.Provider
      value={{
        ...data,
        claimReport,
        dismissReport,
        issueSanction,
        liftSanction,
        closeLobby,
        removeLobbyMember,
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
