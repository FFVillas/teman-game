import PlayerCard from "./PlayerCard";
import { recentTeammates } from "@/data/social-recent";

export default function RecentTeammatesPanel() {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border-default px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img
          src="/icons/social-recent-teammates.svg"
          alt=""
          className="h-auto w-4 opacity-70"
        />
        <span className="text-base font-bold text-white">Recent Teammates</span>
      </div>

      <div className="px-6 pb-2 pt-4">
        <p className="text-sm text-text-muted">
          Players you&apos;ve recently matched with — add them as friends to
          stay in touch.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-1 p-6 pt-2 sm:grid-cols-3">
        {recentTeammates.map((teammate) => (
          <PlayerCard
            key={teammate.id}
            avatar={teammate.avatar}
            name={teammate.name}
            context={`${teammate.teamName} · ${teammate.playedAgo}`}
          />
        ))}
      </div>
    </div>
  );
}
