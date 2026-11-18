import { useSyncExternalStore } from "react";

/**
 * The PWA side of the app: registering the service worker (public/sw.js)
 * and offering "Install app".
 *
 * Browsers that can install a site (Chrome, Edge, Samsung Internet) fire
 * `beforeinstallprompt` once; it is kept here so an "Install app" button can
 * open the browser's install dialog later. Safari on iPhone has no such
 * event: installing there is Share → Add to Home Screen, so the UI shows
 * those steps instead.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * - `prompt`: the browser's install dialog can be opened.
 * - `ios`: Safari on iPhone/iPad, installed by hand from the Share menu.
 * - `installed`: already running as the installed app.
 * - `unsupported`: this browser can't install it (or hasn't offered yet).
 */
export type InstallState = "prompt" | "ios" | "installed" | "unsupported";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag for a home-screen app.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac; touch gives it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function snapshot(): InstallState {
  if (justInstalled || isStandalone()) return "installed";
  if (deferredPrompt) return "prompt";
  if (isIos()) return "ios";
  return "unsupported";
}

/**
 * Called once from the root layout. The service worker is registered only in
 * production builds: in `npm run dev` it would cache files that hot reload
 * is about to replace.
 */
export function startPwa() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep the browser's own banner from popping up; the app offers install
    // where it fits (account menu, Settings).
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    justInstalled = true;
    emit();
  });

  if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // No service worker means no offline screen; the app still works.
      });
  }
}

/** Opens the browser's install dialog. Resolves true if the player accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // The event can be used only once either way.
  deferredPrompt = null;
  if (outcome === "accepted") justInstalled = true;
  emit();
  return outcome === "accepted";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

/** Where installing stands in this browser. "unsupported" on the server. */
export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, snapshot, () => "unsupported");
}
