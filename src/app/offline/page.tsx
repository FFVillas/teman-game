import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline — TemanGame",
};

/**
 * Shown by the service worker (public/sw.js) when a page is opened with no
 * connection. Static and self-contained: no navbar, no data, nothing that
 * needs the network to draw. Lobbies are never served from a cache, because
 * an old list of open slots would mislead more than it helps.
 *
 * "Try again" is a plain link to the current address, not a button with a
 * click handler, so it works even if the page's script never loaded.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-brand">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/logo-mark.svg" alt="" width={26} height={21} />
      </div>
      <div className="flex max-w-[340px] flex-col gap-2">
        <h1 className="text-lg font-extrabold text-white">You&apos;re offline</h1>
        <p className="text-sm text-text-muted">
          TemanGame needs a connection to show lobbies and messages that are up
          to date. Check your internet, then try again.
        </p>
      </div>
      <a
        href=""
        className="flex h-10 items-center justify-center rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90"
      >
        Try again
      </a>
    </main>
  );
}
