"use client";

import { useEffect, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { currentUser as mockCurrentUser } from "@/data/social-friends";
import { createClient } from "@/lib/supabase/client";
import { fetchIncomingRequests } from "@/lib/social";

export default function SocialSidebar() {
  const pathname = usePathname();
  const { user, isReady } = useAuth();
  const displayUser = user ?? mockCurrentUser;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isReady || !user) return;
    let cancelled = false;
    fetchIncomingRequests(createClient(), user.id).then((rows) => {
      if (!cancelled) setPendingCount(rows.length);
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, user]);

  const navItems = [
    { label: "Friends", href: "/social", icon: "/icons/social-friends.svg", badge: undefined as number | undefined },
    { label: "Pending Requests", href: "/social/pending", icon: "/icons/social-inbox.svg", badge: pendingCount },
    { label: "Discover Players", href: "/social/discover", icon: "/icons/social-compass.svg", badge: undefined },
    { label: "Recent Teammates", href: "/social/recent", icon: "/icons/social-recent-teammates.svg", badge: undefined },
    { label: "Blocked", href: "/social/blocked", icon: "/icons/social-blocked.svg", badge: undefined },
  ];

  return (
    <aside className="hidden min-h-0 w-[260px] shrink-0 flex-col border-r border-border-default sm:flex">
      <div className="px-6 py-5">
        <h1 className="text-xl font-extrabold text-white">Social</h1>
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

      <nav className="mt-3 flex flex-col gap-0.5 px-4">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src={item.icon} alt="" className="h-auto w-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {!!item.badge && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-brand px-1 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-border-subtle p-4">
        <UserAvatar src={displayUser.avatar} name={displayUser.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-bold text-white">
            {displayUser.name.split("@")[0]}
          </span>
        </div>
      </div>
    </aside>
  );
}
