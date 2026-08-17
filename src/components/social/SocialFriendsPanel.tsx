"use client";

import { useState } from "react";
import FriendCard from "./FriendCard";
import GameFilterDropdown from "./GameFilterDropdown";
import { onlineFriends, offlineFriends } from "@/data/social-friends";

type Tab = "online" | "all" | "blocked";

const tabs: { id: Tab; label: string }[] = [
  { id: "online", label: "Online" },
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
];

export default function SocialFriendsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("online");
  const showFriends = activeTab === "online" || activeTab === "all";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src="/icons/social-friends.svg" alt="" className="h-auto w-4 opacity-70" />
            <span className="text-base font-bold text-white">Friends</span>
          </div>

          <div className="flex items-center gap-5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 pb-1 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-brand text-white"
                    : "border-transparent text-text-muted hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="flex h-9 items-center justify-center rounded-lg bg-[#10b981] px-4 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          Add Friend
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle px-6 py-4">
        <div className="relative min-w-[200px] flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img
            src="/icons/lfg-search.svg"
            alt=""
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 opacity-60"
          />
          <input
            type="text"
            placeholder="Search Friends"
            className="h-10 w-full rounded-lg border border-border-default bg-bg-page pl-9 pr-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <GameFilterDropdown />
      </div>

      <div className="flex flex-1 flex-col gap-8 p-6">
        {showFriends && (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Online — {onlineFriends.length}
              </h2>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                {onlineFriends.map((friend) => (
                  <FriendCard key={friend.id} friend={friend} />
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Offline — {offlineFriends.length}
              </h2>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                {offlineFriends.map((friend) => (
                  <FriendCard key={friend.id} friend={friend} />
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === "blocked" && (
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-text-muted">
            No blocked players.
          </div>
        )}
      </div>
    </div>
  );
}
