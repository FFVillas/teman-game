import type { LfgTeam } from "@/data/lfg-teams";
import { playstyleLabels } from "@/lib/recommendation";

/**
 * Who the lobby is looking for, in the leader's own words: how it plays (Pb,
 * or the leader's playstyle while the lobby has none) and the personality tags
 * it wants (set B, at most three). These are the lobby's side of the match,
 * never the score itself — the score stays hidden everywhere.
 *
 * Renders nothing when there is nothing to say (a lobby with no playstyle at
 * all and no tags).
 */
export default function LobbyLookingFor({
  team,
  className = "",
}: {
  team: Pick<LfgTeam, "playstyle" | "leaderPlaystyle" | "wantedTags">;
  className?: string;
}) {
  const playstyle = team.playstyle ?? team.leaderPlaystyle ?? null;
  const plays = playstyle ? playstyleLabels[playstyle] : null;
  const tags = team.wantedTags ?? [];
  if (!plays && tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] ${className}`}>
      {plays && (
        <span className="flex items-center gap-1.5 text-text-muted">
          Plays
          <span className="font-bold text-white">{plays}</span>
        </span>
      )}
      {tags.length > 0 && (
        <span className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 font-semibold text-white"
            >
              {tag}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
