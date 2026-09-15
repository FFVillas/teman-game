"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminData } from "@/contexts/AdminDataContext";
import { adminNavItems } from "@/data/admin-nav";
import { adminAccounts } from "@/data/admin-accounts";
import { isUnresolved } from "@/lib/admin";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

/**
 * The console has its own frame instead of the public Navbar/Footer: it's a
 * work tool, used for long stretches, so navigation stays put in a sidebar
 * and the content area is free for dense tables.
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { reports } = useAdminData();

  const openReports = reports.filter(isUnresolved).length;
  const email = adminAccounts.find((account) => account.id === user?.id)?.email;

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const navLinks = (layout: "sidebar" | "bar") =>
    adminNavItems.map((item) => {
      const active = isActive(pathname, item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2.5 rounded-lg text-[13px] font-semibold transition-colors ${
            layout === "sidebar" ? "px-3 py-2" : "px-3 py-1.5"
          } ${
            active
              ? "bg-white/[0.06] text-white"
              : "text-text-muted hover:bg-white/[0.03] hover:text-white"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img
            src={item.icon}
            alt=""
            className={`size-4 ${active ? "opacity-100" : "opacity-60"}`}
          />
          <span className="flex-1">{item.label}</span>
          {item.badge === "openReports" && openReports > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
              {openReports}
            </span>
          )}
        </Link>
      );
    });

  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[212px] shrink-0 flex-col border-r border-border-subtle bg-bg-nav lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <Logo compact />
          <span className="rounded-md border border-border-strong px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-text-muted">
            Admin
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {navLinks("sidebar")}
        </nav>

        <div className="flex flex-col gap-3 border-t border-border-subtle p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
              {user?.name.charAt(0) ?? "A"}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-bold text-white">
                {user?.name}
              </span>
              {email && (
                <span className="truncate text-[11px] text-text-muted">
                  {email}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-8 items-center justify-center gap-2 rounded-lg border border-border-default text-xs font-semibold text-text-muted transition-colors hover:border-danger/50 hover:text-danger"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src="/icons/admin-logout.svg" alt="" className="size-3.5 opacity-70" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-40 flex flex-col gap-2 border-b border-border-subtle bg-bg-nav px-4 pb-2 pt-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo compact />
            <span className="rounded-md border border-border-strong px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-text-muted">
              Admin
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-semibold text-text-muted transition-colors hover:text-danger"
          >
            Log out
          </button>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">{navLinks("bar")}</nav>
      </header>

      <main className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-5 px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
