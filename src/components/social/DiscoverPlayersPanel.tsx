import PlayerCard from "./PlayerCard";
import { discoverPlayers } from "@/data/social-discover";

export default function DiscoverPlayersPanel() {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
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
            placeholder="Search by name or game"
            className="h-10 w-full rounded-lg border border-border-default bg-bg-page pl-9 pr-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 p-6 pt-2 sm:grid-cols-3">
        {discoverPlayers.map((player) => (
          <PlayerCard
            key={player.id}
            avatar={player.avatar}
            name={player.name}
            context={`${player.game} · ${player.rank}`}
          />
        ))}
      </div>
    </div>
  );
}
