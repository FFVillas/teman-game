"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "@/data/nav-links";

/**
 * The game links on small screens.
 *
 * The desktop nav is `hidden lg:flex` because six game names don't fit beside
 * the logo and the account controls. Without this button those links simply
 * disappeared below 1024px, which left a phone with no way into any game but
 * the landing page's grid.
 *
 * Same anchored-dropdown shape as SortDropdown / LobbyActionsMenu (see
 * AGENTS.md), with one difference: the panel is pinned to the viewport edges
 * rather than the button, because a 375px screen has no room for a panel
 * hanging off a 32px trigger.
 */
export default function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative lg:hidden" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex size-8 items-center justify-center rounded-lg border border-border-default bg-white/5 transition-colors hover:border-border-strong"
      >
        <span className="flex w-4 flex-col gap-[3px]" aria-hidden>
          <span
            className={`h-[1.5px] w-full rounded-full bg-white transition-transform ${
              open ? "translate-y-[4.5px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-[1.5px] w-full rounded-full bg-white transition-opacity ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-[1.5px] w-full rounded-full bg-white transition-transform ${
              open ? "-translate-y-[4.5px] -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="fixed inset-x-0 top-[60px] z-50 border-b border-border-default bg-bg-nav p-3 shadow-xl shadow-black/40"
        >
          <span className="block px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Games
          </span>
          <ul className="grid grid-cols-2 gap-1">
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    role="menuitem"
                    // Closed here rather than in an effect on `pathname`:
                    // tapping the game you're already on navigates nowhere,
                    // and the panel still has to shut.
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-text-muted hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                    <img
                      src={link.icon}
                      alt=""
                      width={link.iconWidth}
                      height={link.iconHeight}
                      className="shrink-0"
                      style={{ width: link.iconWidth, height: link.iconHeight }}
                    />
                    <span className="truncate">{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
