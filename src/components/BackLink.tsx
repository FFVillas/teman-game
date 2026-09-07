"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface BackLinkProps {
  label: string;
  /** Where to go. Also the fallback when `useHistory` has nothing to pop. */
  href: string;
  /**
   * Go back through browser history instead of straight to `href`. Use this
   * when a page is reachable from several places and "where you came from"
   * is more useful than a fixed destination.
   */
  useHistory?: boolean;
  /** Opt out of sticky positioning (e.g. inside a modal). */
  sticky?: boolean;
}

const inner = (
  label: string
): React.ReactNode => (
  <>
    {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
    <img src="/icons/lfg-back-arrow.svg" alt="" className="size-4" />
    {label}
  </>
);

/**
 * Sticks just under the 60px navbar so it stays reachable on long pages —
 * on the lobby, profile and match screens the back link would otherwise
 * scroll away and force a trip to the top. Kept as a sticky strip rather
 * than a floating button: it holds its place in the layout, doesn't cover
 * content, and stays where the eye already expects a back control.
 */
export default function BackLink({
  label,
  href,
  useHistory = false,
  sticky = true,
}: BackLinkProps) {
  const router = useRouter();

  const wrapperClass = sticky
    ? "sticky top-[60px] z-30 -mx-6 -mt-2 mb-1 border-b border-transparent bg-bg-page/85 px-6 py-3 backdrop-blur-sm"
    : "";

  const linkClass =
    "flex w-fit items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-white";

  return (
    <div className={wrapperClass}>
      {useHistory ? (
        <button
          type="button"
          onClick={() => {
            // history.length <= 1 means this tab opened straight onto the
            // page, so there's nothing sensible to pop — use the fallback.
            if (window.history.length > 1) router.back();
            else router.push(href);
          }}
          className={linkClass}
        >
          {inner(label)}
        </button>
      ) : (
        <Link href={href} className={linkClass}>
          {inner(label)}
        </Link>
      )}
    </div>
  );
}
