import Link from "next/link";
import { APP_ICON } from "@/data/mascot";

/**
 * The mark is the app icon as the designer drew it — Bounce in white on a
 * rounded brand square (`public/mascot/app-icon.svg`), one file rather than a
 * `bg-brand` box with a glyph inside it. Its padding and corner radius come
 * from the artwork, so the navbar can't drift away from the installed app's
 * icon.
 *
 * `hideWordmarkUntilXs` drops the "TemanGame" text below 368px. In the navbar
 * the mark, the menu button and the auth buttons together overran a 320px
 * phone, and the wordmark is the one piece that repeats the page's own
 * branding — the mark alone still goes home.
 *
 * `asLink={false}` draws the same lockup without the link, for screens that
 * must not be left by accident (onboarding: a click home lost every answer
 * and, being a client-side navigation, slipped past proxy.ts's setup gate).
 */
export default function Logo({
  compact = false,
  hideWordmarkUntilXs = false,
  asLink = true,
}: {
  compact?: boolean;
  hideWordmarkUntilXs?: boolean;
  asLink?: boolean;
}) {
  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img
          src={APP_ICON}
          alt=""
          width={compact ? 24 : 32}
          height={compact ? 24 : 32}
          className={`shrink-0 ${compact ? "size-6" : "size-8"}`}
        />
        <span
          className={`font-display font-black italic tracking-[-1px] text-white ${
            compact ? "text-sm" : "text-base"
          } ${hideWordmarkUntilXs ? "hidden xs:inline" : ""}`}
        >
          TemanGame
        </span>
    </>
  );
  const className = "flex shrink-0 items-center gap-2";
  return asLink ? (
    <Link href="/" className={className}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}
