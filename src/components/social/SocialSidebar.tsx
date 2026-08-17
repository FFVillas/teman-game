"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentUser } from "@/data/social-friends";
import { pendingRequests } from "@/data/social-pending";

const navItems = [
  { label: "Friends", href: "/social", icon: "/icons/social-friends.svg", badge: undefined as number | undefined },
  { label: "Pending Requests", href: "/social/pending", icon: "/icons/social-inbox.svg", badge: pendingRequests.length },
  { label: "Discover Players", href: "/social/discover", icon: "/icons/social-compass.svg", badge: undefined },
  { label: "Recent Teammates", href: "/social/recent", icon: "/icons/social-recent-teammates.svg", badge: undefined },
];

export default function SocialSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border-default sm:flex">
      <div className="p-6">
        <h1 className="text-2xl font-extrabold text-white">Social</h1>
      </div>

      <div className="px-4">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img
            src="/icons/lfg-search.svg"
            alt=""
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 opacity-60"
          />
          <input
            type="text"
            placeholder="Find a conversation..."
            className="h-10 w-full rounded-lg border border-border-default bg-bg-page pl-9 pr-3 text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <nav className="mt-4 flex flex-col gap-1 px-4">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src={item.icon} alt="" className="h-auto w-[18px]" />
              <span className="flex-1 text-left">{item.label}</span>
              {!!item.badge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-brand px-1 text-[11px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-border-subtle p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
        <img
          src={currentUser.avatar}
          alt=""
          className="size-10 rounded-full object-cover"
        />
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-bold text-white">{currentUser.name}</span>
        </div>
        <button
          type="button"
          aria-label="Settings"
          className="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-white/5 hover:text-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/social-settings.svg" alt="" className="size-4" />
        </button>
      </div>
    </aside>
  );
}
