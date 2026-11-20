import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Mascot from "@/components/Mascot";

export const metadata: Metadata = {
  title: "Page not found — TemanGame",
};

/**
 * The 404. Twenty-one places call `notFound()` — a lobby that ended, a
 * username nobody holds, a match that isn't yours, `/admin` for anyone who
 * isn't staff — and until this file existed every one of them landed on
 * Next's own bare default: white text on black, no navbar, no way back
 * except the browser's own button.
 *
 * So the point of this page is the navbar and the two links, not the mascot.
 * Bounce is here because the tone matters: most 404s on this site are a
 * lobby that filled up or ended while the player was reading about it, which
 * is ordinary, not a failure. `lost` is the pose with a question mark —
 * puzzled, not broken. `error` (the red one) is for `error.tsx`, where
 * something really did go wrong.
 *
 * Deliberately **not** reached for `/admin`: the admin layout calls
 * `notFound()` so a visitor can't tell a staff-only console apart from an
 * address that was never there. This page keeps that true by saying nothing
 * about why.
 */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
        <Mascot pose="lost" size={128} />

        <div className="flex max-w-[380px] flex-col gap-2">
          <h1 className="text-xl font-extrabold text-white sm:text-2xl">
            We can&apos;t find that page
          </h1>
          <p className="text-sm leading-relaxed text-text-muted">
            The link may be wrong, or the lobby, profile or match it pointed
            at is gone. Lobbies close once they fill up or end.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/lfg/valorant"
            className="flex h-10 items-center justify-center rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            Browse lobbies
          </Link>
          <Link
            href="/"
            className="flex h-10 items-center justify-center rounded-lg border border-border-strong px-5 text-xs font-bold text-text-subtle transition-colors hover:border-white/30 hover:text-white"
          >
            Go home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
