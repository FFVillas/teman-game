"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification, NotificationKind } from "@/data/notifications";
import { useRealtimeInserts } from "@/lib/realtime";
import {
  fetchNotifications,
  insertNotification,
  markAllNotificationsRead,
  markNotificationRead,
  notifyUser,
  resolveNotification,
  type CrossPlayerNotificationKind,
} from "@/lib/notifications";

export type ToastTone = "success" | "info" | "danger";

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  body?: string;
  href?: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** Accept or decline an actionable notification (invite / join request). */
  resolve: (id: string, resolution: "accepted" | "declined") => void;
  /** Transient confirmation of something the user just did. */
  toast: (input: Omit<Toast, "id">) => void;
  /** An incoming event: shows a toast *and* files a row in `notifications`. */
  notify: (
    input: Omit<Toast, "id"> & {
      kind: NotificationKind;
      /** A real profile id, when there is one. */
      actorId?: string;
    }
  ) => void;
  /**
   * Notifies a DIFFERENT player (invited them, applied to their lobby) —
   * no local toast, since the caller already shows their own confirmation.
   * Not wired into any lobby UI yet; see `notifyUser` in `@/lib/notifications`.
   */
  notifyPlayer: (
    targetUserId: string,
    input: {
      kind: CrossPlayerNotificationKind;
      title: string;
      body?: string;
      href?: string;
    }
  ) => void;
  dismissToast: (id: string) => void;
  toasts: Toast[];
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

/** Also drives the toast's countdown bar — see ToastHost. */
export const TOAST_MS = 4500;

/**
 * Two different things live here, deliberately:
 *
 * - **Toasts** are local and stay local. They confirm something you just did
 *   and vanish after a few seconds, so there's nothing worth storing —
 *   writing them to the database would add a round trip to a confirmation
 *   you're already looking at.
 * - **Notifications** are rows in `public.notifications`: incoming events you
 *   may need to come back to. They survive a reload, a new device and a
 *   different browser, and the unread count on the bell is real.
 *
 * Delivery is still "on page load". Real-time push (Firebase Cloud Messaging
 * through a service worker, per the proposal) sits on top of this table
 * later; a Supabase realtime subscription is the cheaper first step.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Staff accounts have no player notifications, and a signed-out visitor has
  // nothing to show — in both cases the list stays empty rather than querying
  // a table RLS would hand back empty anyway.
  const playerId = user?.role === "player" ? user.id : null;

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    // Signing out resolves to an empty list through the same path, so the
    // previous account's notifications can't linger on screen.
    const load = playerId
      ? fetchNotifications(createClient())
      : Promise.resolve<AppNotification[]>([]);

    load.then((rows) => {
      if (!cancelled) setNotifications(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, playerId]);

  // A notification written by someone else (or by another tab) lands here
  // without a reload. `notify()` already adds its own row locally, so the
  // id check stops it appearing twice.
  useRealtimeInserts<{ id: string }>({
    table: "notifications",
    filter: playerId ? `user_id=eq.${playerId}` : undefined,
    enabled: Boolean(playerId),
    onInsert: () => {
      if (!playerId) return;
      fetchNotifications(createClient()).then((rows) => setNotifications(rows));
    },
  });

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback((input: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...input, id }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, TOAST_MS);
    timers.current.set(id, timer);
  }, []);

  // Clear any pending timers if the provider unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const notify = useCallback<NotificationContextValue["notify"]>(
    ({ kind, actorId, ...toastInput }) => {
      pushToast(toastInput);
      if (!playerId) return;

      insertNotification(createClient(), playerId, {
        kind,
        title: toastInput.title,
        body: toastInput.body,
        href: toastInput.href,
        actorId,
      }).then((saved) => {
        if (saved) setNotifications((prev) => [saved, ...prev]);
      });
    },
    [playerId, pushToast]
  );

  const notifyPlayer = useCallback<NotificationContextValue["notifyPlayer"]>(
    (targetUserId, input) => {
      if (!playerId) return;
      notifyUser(createClient(), targetUserId, input);
    },
    [playerId]
  );

  // Optimistic: these rows belong to the caller, so there's no refusal worth
  // holding the UI for. A failed write just means the next load re-reads it.
  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    markNotificationRead(createClient(), id);
  }, []);

  const markAllRead = useCallback(() => {
    if (!playerId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead(createClient(), playerId);
  }, [playerId]);

  const resolve = useCallback(
    (id: string, resolution: "accepted" | "declined") => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, resolution, read: true } : n))
      );
      resolveNotification(createClient(), id, resolution);
    },
    []
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markRead,
        markAllRead,
        resolve,
        toast: pushToast,
        notify,
        notifyPlayer,
        toasts,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
