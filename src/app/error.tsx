"use client";

import { useEffect } from "react";
import Link from "next/link";
import Mascot from "@/components/Mascot";

/**
 * The last resort when a page throws. Next requires it to be a Client
 * Component, and it replaces the whole page below the root layout — so no
 * `Navbar` here: that would run the auth and notification contexts again
 * inside the boundary that just caught their failure, and a second throw in
 * an error boundary takes down the whole app.
 *
 * `reset()` re-renders the segment without a full page load, which is the
 * right first thing to offer: most failures here are a Supabase call that
 * timed out, and trying again fixes those.
 *
 * **The error itself is never shown.** A stack or a Postgres message tells a
 * player nothing they can act on, and can name tables and columns. It goes to
 * the console, where it is already going anyway.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <Mascot pose="error" size={128} />

      <div className="flex max-w-[380px] flex-col gap-2">
        <h1 className="text-xl font-extrabold text-white sm:text-2xl">
          Something went wrong
        </h1>
        <p className="text-sm leading-relaxed text-text-muted">
          That page didn&apos;t load. Trying again usually sorts it — if it
          keeps happening, let us know through support.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="flex h-10 items-center justify-center rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="flex h-10 items-center justify-center rounded-lg border border-border-strong px-5 text-xs font-bold text-text-subtle transition-colors hover:border-white/30 hover:text-white"
        >
          Go home
        </Link>
      </div>

      {/* Next gives a failure on the server a digest, and that same digest is
          in the server log — the one thing worth showing, so a bug report can
          be matched to its trace. */}
      {error.digest && (
        <p className="text-[11px] text-text-muted/70">
          Reference: {error.digest}
        </p>
      )}
    </main>
  );
}
