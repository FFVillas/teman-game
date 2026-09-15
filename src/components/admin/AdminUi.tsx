"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { adminToneClasses, type AdminTone } from "@/data/admin-nav";

/**
 * Small building blocks every admin screen shares. Kept in one file because
 * they're tiny and only make sense together — the larger pieces (modals,
 * tables of a specific entity) get their own files.
 */

export function AdminBadge({
  tone,
  children,
}: {
  tone: AdminTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${adminToneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function AdminPageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { label: string; href: string };
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {back && (
        <Link
          href={back.href}
          className="flex w-fit items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/lfg-back-arrow.svg" alt="" className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-xl font-extrabold text-white">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-text-muted">{description}</p>
          )}
          {meta && (
            <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

export function AdminCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col gap-3 rounded-2xl border border-border-strong bg-bg-card-alt p-5 ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && (
            <h2 className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-text-muted">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={`flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
              selected
                ? "border-brand/50 bg-brand/10 text-white"
                : "border-border-default text-text-muted hover:border-border-strong hover:text-white"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`text-[11px] ${selected ? "text-brand" : "text-text-muted"}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AdminSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative flex h-8 w-full items-center sm:w-64">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
      <img
        src="/icons/lfg-search.svg"
        alt=""
        className="pointer-events-none absolute left-3 size-3.5"
      />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full w-full rounded-lg border border-border-default bg-bg-page pl-8 pr-3 text-xs text-white placeholder:text-text-muted focus:border-brand/60 focus:outline-none"
      />
    </label>
  );
}

export function Avatar({
  src,
  size = "md",
  dimmed = false,
}: {
  src: string;
  size?: "sm" | "md" | "lg";
  dimmed?: boolean;
}) {
  const sizeClass = { sm: "size-6", md: "size-8", lg: "size-14" }[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
    <img
      src={src}
      alt=""
      className={`${sizeClass} shrink-0 rounded-full object-cover ${dimmed ? "opacity-50 grayscale" : ""}`}
    />
  );
}

/** Table shell. Rows use the stretched-link pattern — see AdminRowLink. */
export function AdminTable({
  head,
  children,
  minWidth = "min-w-[720px]",
}: {
  head: string[];
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-strong bg-bg-card-alt">
      <table className={`w-full ${minWidth} text-left text-xs`}>
        <thead>
          <tr className="border-b border-border-default">
            {head.map((label) => (
              <th
                key={label}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text-muted"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">{children}</tbody>
      </table>
    </div>
  );
}

export const adminRowClass =
  "group relative transition-colors hover:bg-white/[0.03]";

/**
 * The row's one real link. `after:` stretches its hit area over the whole
 * `<tr>` (which is `relative`), so any cell opens the record.
 */
export function AdminRowLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-bold text-white after:absolute after:inset-0 after:content-[''] group-hover:text-brand"
    >
      {children}
    </Link>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-10 text-center text-xs text-text-muted"
      >
        {label}
      </td>
    </tr>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: AdminTone;
}) {
  const valueTone =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
        ? "text-warning"
        : "text-white";

  const body = (
    <>
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span className={`font-heading text-2xl font-extrabold ${valueTone}`}>
        {value}
      </span>
      {hint && <span className="text-[11px] text-text-muted">{hint}</span>}
    </>
  );

  const className =
    "flex flex-col gap-1 rounded-2xl border border-border-strong bg-bg-card-alt p-4";

  return href ? (
    <Link
      href={href}
      className={`${className} transition-colors hover:border-brand/40`}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export const adminButton = {
  primary:
    "flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
  danger:
    "flex h-9 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
  secondary:
    "flex h-9 items-center justify-center gap-2 rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-subtle transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40",
  ghostDanger:
    "flex h-9 items-center justify-center gap-2 rounded-lg border border-danger/40 px-4 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40",
};

export const adminFieldClass =
  "w-full rounded-lg border border-border-default bg-bg-page px-3 text-xs text-white placeholder:text-text-muted focus:border-brand/60 focus:outline-none";
