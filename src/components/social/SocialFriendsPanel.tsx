"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FriendCard from "./FriendCard";
import GameFilterDropdown from "./GameFilterDropdown";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchFriends, type FriendRow } from "@/lib/social";

/**
 * No Online/All tabs: that split needs a presence system this app doesn't
 * have yet (see FriendCard). One list, filtered by the search box, is the
 * honest version of this panel until realtime presence exists.
 */
export default function SocialFriendsPanel() {
  const { user, isReady } = useAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const load = user
      ? fetchFriends(createClient(), user.id)
      : Promise.resolve<FriendRow[]>([]);
    load.then((rows) => {
      if (!cancelled) {
        setFriends(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, user]);

  const visible = friends.filter((f) =>
    f.username.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default px-6 py-4">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/social-friends.svg" alt="" className="h-auto w-4 opacity-70" />
          <span className="text-base font-bold text-white">Friends</span>
        </div>

        {/* Adding a friend means finding one first — this is the entry point
            to Discover rather than a dead button. */}
        <Link
          href="/social/discover"
          className="flex h-9 items-center justify-center rounded-lg bg-success px-4 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          Add Friend
        </Link>
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
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Friends"
            className="h-10 w-full rounded-lg border border-border-default bg-bg-page pl-9 pr-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <GameFilterDropdown />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-6">
        {loading ? null : visible.length === 0 ? (
          <EmptyState
            icon="/icons/social-friends.svg"
            title={friends.length === 0 ? "No friends yet" : "No matches"}
            description={
              friends.length === 0
                ? "Add teammates from Discover Players to see them here."
                : "Try a different search."
            }
          />
        ) : (
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Friends — {visible.length}
            </h2>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-1 lg:grid-cols-2">
              {visible.map((friend) => (
                <FriendCard
                  key={friend.friendshipId}
                  id={friend.id}
                  name={friend.username}
                  avatar={friend.avatar}
                  onBlocked={() =>
                    setFriends((prev) =>
                      prev.filter((f) => f.friendshipId !== friend.friendshipId)
                    )
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
