import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Messaging } from "firebase/messaging";

/**
 * Push notifications on this device, through Firebase Cloud Messaging.
 *
 * Turning push on asks the browser for permission, gets this device's FCM
 * token (tied to our own service worker, public/sw.js, which draws the
 * notification) and stores it in `push_tokens`. From then on every new row in
 * `notifications` also reaches this device, even with the app closed (see
 * 20261119000000_push_notifications.sql and /api/push).
 *
 * Public settings (safe in the browser, set on Vercel and in .env.local):
 *   NEXT_PUBLIC_FIREBASE_CONFIG     the web app's firebaseConfig, as JSON
 *   NEXT_PUBLIC_FIREBASE_VAPID_KEY  Cloud Messaging → Web Push certificates
 */

const TOKEN_KEY = "temangame:push-token";

/**
 * - `on` / `off`: push works here; whether it's turned on for this device.
 * - `denied`: the player blocked notifications in the browser's settings.
 * - `needs-install`: an iPhone or iPad in Safari; push needs the home-screen app.
 * - `unsupported`: this browser can't do push, or it isn't set up (dev).
 */
export type PushState = "on" | "off" | "denied" | "needs-install" | "unsupported";

function firebaseConfig(): Record<string, string> | null {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (!raw || !process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode: push still works, it just can't be turned off from here.
  }
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** "Chrome on Android", for the player's own list of devices. */
function deviceLabel(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : isIos()
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

function readState(): PushState {
  const supported =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIos() ? "needs-install" : "unsupported";
  if (!firebaseConfig()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && storedToken() ? "on" : "off";
}

let messagingPromise: Promise<Messaging | null> | null = null;

/** Loads Firebase only when push is actually used, so other pages stay light. */
function messaging(): Promise<Messaging | null> {
  messagingPromise ??= (async () => {
    const config = firebaseConfig();
    if (!config) return null;
    const [{ initializeApp, getApps }, fcm] = await Promise.all([
      import("firebase/app"),
      import("firebase/messaging"),
    ]);
    if (!(await fcm.isSupported())) return null;
    return fcm.getMessaging(getApps()[0] ?? initializeApp(config));
  })();
  return messagingPromise;
}

/** This device's FCM token, tied to our service worker. */
async function currentToken(): Promise<string | null> {
  const fcm = await messaging();
  // Registered in production builds only (lib/pwa.ts); none in `npm run dev`.
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!fcm || !registration) return null;
  const { getToken } = await import("firebase/messaging");
  return getToken(fcm, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
}

/** Asks for permission and stores this device. Returns the new state. */
export async function enablePush(supabase: SupabaseClient): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return readState();

  const token = await currentToken();
  if (!token) return "unsupported";
  const { error } = await supabase.rpc("register_push_token", {
    p_token: token,
    p_device: deviceLabel(),
  });
  if (error) throw error;
  storeToken(token);
  return "on";
}

/** Stops push on this device. Also called on logout. */
export async function disablePush(supabase: SupabaseClient): Promise<void> {
  const token = storedToken();
  if (!token) return;
  storeToken(null);
  await supabase.rpc("unregister_push_token", { p_token: token });
  const fcm = await messaging().catch(() => null);
  if (fcm) {
    const { deleteToken } = await import("firebase/messaging");
    await deleteToken(fcm).catch(() => {});
  }
}

/**
 * On each app start for a signed-in player with push on: FCM tokens can
 * change, so store the current one (and drop the old) to keep it working.
 */
export async function refreshPush(supabase: SupabaseClient): Promise<void> {
  if (readState() !== "on") return;
  const previous = storedToken();
  const token = await currentToken().catch(() => null);
  if (!token) return;
  if (previous && previous !== token) {
    await supabase.rpc("unregister_push_token", { p_token: previous });
  }
  await supabase.rpc("register_push_token", { p_token: token, p_device: deviceLabel() });
  storeToken(token);
}

/** The Settings toggle's state, and the actions behind it. */
export function usePush(supabase: () => SupabaseClient) {
  const [state, setState] = useState<PushState>("unsupported");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Browser-only facts, read after mount so the server render matches.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of browser state on mount
    setState(readState());
  }, []);

  const turnOn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setState(await enablePush(supabase()));
    } catch {
      setError("Couldn't turn on notifications. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }, [supabase]);

  const turnOff = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await disablePush(supabase());
      setState(readState());
    } catch {
      setError("Couldn't turn off notifications. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }, [supabase]);

  return { state, busy, error, turnOn, turnOff };
}
