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
import {
  seedNotifications,
  type AppNotification,
  type NotificationKind,
} from "@/data/notifications";

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
  /** An incoming event: shows a toast *and* lands in the notification list. */
  notify: (
    input: Omit<Toast, "id"> & {
      kind: NotificationKind;
      actorName?: string;
      actorAvatar?: string;
    }
  ) => void;
  dismissToast: (id: string) => void;
  toasts: Toast[];
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "temangame:notifications";
const TOAST_MS = 4500;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] =
    useState<AppNotification[]>(seedNotifications);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Same frontend-only pattern as AuthContext: read state can't be known
  // during SSR, so hydrate from localStorage once on mount.
  // TODO: replace with Firebase Cloud Messaging + a `notifications` table.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications(JSON.parse(stored) as AppNotification[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persist = useCallback((next: AppNotification[]) => {
    setNotifications(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    (input: Omit<Toast, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...input, id }]);
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timers.current.delete(id);
      }, TOAST_MS);
      timers.current.set(id, timer);
    },
    []
  );

  // Clear any pending timers if the provider unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const notify = useCallback<NotificationContextValue["notify"]>(
    ({ kind, actorName, actorAvatar, ...toastInput }) => {
      pushToast(toastInput);
      setNotifications((prev) => {
        const next: AppNotification[] = [
          {
            id: `n-${Date.now()}`,
            kind,
            title: toastInput.title,
            body: toastInput.body ?? "",
            actorName,
            actorAvatar,
            href: toastInput.href,
            createdAgo: "just now",
            read: false,
          },
          ...prev,
        ];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [pushToast]
  );

  const markRead = useCallback(
    (id: string) => {
      persist(
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    },
    [notifications, persist]
  );

  const resolve = useCallback(
    (id: string, resolution: "accepted" | "declined") => {
      persist(
        notifications.map((n) =>
          n.id === id ? { ...n, resolution, read: true } : n
        )
      );
    },
    [notifications, persist]
  );

  const markAllRead = useCallback(() => {
    persist(notifications.map((n) => ({ ...n, read: true })));
  }, [notifications, persist]);

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
