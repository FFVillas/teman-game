import PlayerCard from "./PlayerCard";
import { EmptyState } from "@/components/EmptyState";

export interface RecentTeammate {
  id: string;
  name: string;
  avatar: string;
  /** "Night Ranked · 2 days ago" */
  context: string;
}

/** Real teammates from finished lobbies; the page reads them. */
export default function RecentTeammatesPanel({
  teammates,
  signedIn,
}: {
  teammates: RecentTeammate[];
  signedIn: boolean;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border-default px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img
          src="/icons/social-recent-teammates.svg"
          alt=""
          className="h-auto w-4 opacity-70"
        />
        <span className="text-sm font-bold text-white">Recent Teammates</span>
      </div>

      {teammates.length === 0 ? (
        <div className="flex flex-1 flex-col p-6">
          <EmptyState
            fill
            icon="/icons/social-recent-teammates.svg"
            title={signedIn ? "No teammates yet" : "Log in to see your teammates"}
            description={
              signedIn
                ? "People you finish a lobby with show up here, so you can add the good ones as friends."
                : "Players you finish a lobby with show up here."
            }
            action={
              signedIn
                ? { label: "Find a lobby", href: "/lfg/valorant" }
                : { label: "Log in", href: "/login?next=%2Fsocial%2Frecent" }
            }
          />
        </div>
      ) : (
        <>
          <div className="px-6 pb-2 pt-4">
            <p className="text-sm text-text-muted">
              Players you&apos;ve finished a lobby with. Add them as friends to
              stay in touch.
            </p>
          </div>

          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-1 overflow-y-auto p-6 pt-2 lg:grid-cols-2">
            {teammates.map((teammate) => (
              <PlayerCard
                key={teammate.id}
                id={teammate.id}
                avatar={teammate.avatar}
                name={teammate.name}
                context={teammate.context}
                real
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
