import type { ReactNode } from "react";
import Link from "next/link";

/**
 * How emptiness is shown across the app.
 *
 * Two rules, both aimed at the same thing — an empty profile should *look*
 * empty rather than look like data:
 *
 * 1. A missing value is dimmer than a real one (`NotSet`), never a plausible
 *    stand-in. On a product whose pitch is trustworthy player data, filler
 *    that reads like a real answer is the worst possible default.
 * 2. An empty section says what would be there and, when the viewer is the
 *    one who can fix it, offers the action (`EmptyState`). Nobody else's
 *    empty profile is actionable, so visitors get the explanation only.
 */

export function NotSet({ label = "Not set" }: { label?: string }) {
  return <span className="text-xs italic text-text-muted/70">{label}</span>;
}

/**
 * An empty value the viewer can fill in themselves. Falls back to plain
 * `NotSet` for anyone else, so a visitor never sees an action meant for the
 * profile's owner.
 */
export function NotSetOrAdd({
  isOwner,
  href,
  action = "Add",
  label,
}: {
  isOwner: boolean;
  href: string;
  action?: string;
  label?: string;
}) {
  if (!isOwner) return <NotSet label={label} />;
  return (
    <Link
      href={href}
      className="text-xs italic text-text-muted/70 underline decoration-dotted underline-offset-4 transition-colors hover:text-brand hover:no-underline"
    >
      {action}
    </Link>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
}: {
  /** Path to an SVG in /icons. Optional — small slots read fine without one. */
  icon?: string;
  title: string;
  description?: ReactNode;
  action?: { label: string; href: string };
  size?: "sm" | "md";
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-default text-center ${
        size === "sm" ? "px-4 py-5" : "px-5 py-8"
      }`}
    >
      {icon && (
        <span className="flex size-9 items-center justify-center rounded-full bg-white/[0.04]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src={icon} alt="" className="size-4 opacity-40" />
        </span>
      )}
      <span className="text-xs font-bold text-text-subtle">{title}</span>
      {description && (
        <p className="max-w-[300px] text-[11px] leading-relaxed text-text-muted">
          {description}
        </p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-1 flex h-8 items-center justify-center rounded-lg border border-border-strong px-3.5 text-[11px] font-bold text-text-subtle transition-colors hover:border-brand/60 hover:text-white"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
