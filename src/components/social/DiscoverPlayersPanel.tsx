"use client";

import { useEffect, useState } from "react";
import PlayerCard from "./PlayerCard";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchDiscoverCandidates, type SocialProfile } from "@/lib/social";

export default function DiscoverPlayersPanel() {
  const { user, isReady } = useAuth();
  const [players, setPlayers] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const supabase = createClient();
    // Debounced: a query fires per keystroke otherwise.
    const timer = setTimeout(() => {
      const load = user
        ? fetchDiscoverCandidates(supabase, user.id, query)
        : Promise.resolve<SocialProfile[]>([]);
      load.then((rows) => {
        if (!cancelled) {
          setPlayers(rows);
          setLoading(false);
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isReady, user, query]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border-default px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/social-compass.svg" alt="" className="h-auto w-4 opacity-70" />
        <span className="text-base font-bold text-white">Discover Players</span>
      </div>

      <div className="flex flex-col gap-3 px-6 pb-2 pt-4">
        <p className="text-sm text-text-muted">
          Find new players to team up with across all your games.
        </p>
        <div className="relative">
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
            placeholder="Search by username"
            className="h-10 w-full rounded-lg border border-border-default bg-bg-page pl-9 pr-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-1 overflow-y-auto p-6 pt-2 sm:grid-cols-1 lg:grid-cols-2">
        {!loading && players.length === 0 && (
          <div className="sm:col-span-1 lg:col-span-2">
            <EmptyState
              icon="/icons/social-compass.svg"
              title={query ? "No players found" : "Nobody new to discover yet"}
              description={
                query
                  ? "Try a different username."
                  : "Once more players sign up, they'll show up here."
              }
            />
          </div>
        )}
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            id={player.id}
            avatar={player.avatar}
            name={player.username}
            real
            onBlocked={() =>
              setPlayers((prev) => prev.filter((p) => p.id !== player.id))
            }
          />
        ))}
      </div>
    </div>
  );
}
