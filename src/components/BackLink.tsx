"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BackLinkProps {
  label: string;
  /**
   * Where to go when there is no earlier page of the app to return to (the
   * page was opened directly, from a link elsewhere, or in a new tab). It is
   * also what `label` describes.
   */
  href: string;
  /**
   * Go back to the page you came from (the default), whatever it was: a
   * profile opened from a lobby returns to that lobby, not to a fixed list.
   * Pass `false` for a section that must leave itself (Social).
   */
  useHistory?: boolean;
  /** Opt out of sticky positioning (e.g. inside a modal). */
  sticky?: boolean;
}

/**
 * Is there an earlier page of this app in the history? The Navigation API
 * answers exactly that (same-origin entries only, so a tab that opened on an
 * outside site, or a new tab, has none). Where it isn't available the old
 * check is used: more than one entry in the history.
 */
function canGoBackInApp(): boolean {
  const navigation = (window as unknown as { navigation?: { canGoBack?: boolean } })
    .navigation;
  if (typeof navigation?.canGoBack === "boolean") return navigation.canGoBack;
  return window.history.length > 1;
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
  useHistory = true,
  sticky = true,
}: BackLinkProps) {
  const router = useRouter();
  // Whether there is an earlier page of this app to go back to. Known only in
  // the browser, so it starts false (the fixed label and link) and is settled
  // after mount.
  const [canGoBack, setCanGoBack] = useState(false);
  useEffect(() => {
    // Runs once on mount to read browser-only state (same exemption as
    // SocialBackLink and AuthContext).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanGoBack(canGoBackInApp());
  }, []);

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
            if (canGoBackInApp()) router.back();
            else router.push(href);
          }}
          className={linkClass}
        >
          {/* "Back" once we know it goes to the previous page; the specific
              label ("Back to lobbies") is for the page that has nowhere to
              return to, where it describes the fixed destination. */}
          {inner(canGoBack ? "Back" : label)}
        </button>
      ) : (
        <Link href={href} className={linkClass}>
          {inner(label)}
        </Link>
      )}
    </div>
  );
}
