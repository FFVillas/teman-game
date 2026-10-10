"use client";

import { useState } from "react";
import GameDetailsFields from "@/components/profile/GameDetailsFields";
import { emptyGameProfile, type GameProfile } from "@/lib/game-profile";
import type { GameInfo } from "@/lib/games";

// Kept here so existing imports of these keep working.
export { emptyGameProfile };
export type { GameProfile };

/**
 * A plain object patch races against itself if two updates for the same
 * game fire before React re-renders (e.g. two role chips toggled in the
 * same tick): each closure captures the same stale `profile`, so the
 * second overwrites the first instead of composing. The function form
 * always resolves against the latest state instead.
 */
type ProfilePatch =
  | Partial<GameProfile>
  | ((current: GameProfile) => Partial<GameProfile>);

interface RankRoleStepProps {
  catalog: GameInfo[];
  /** Game slugs, in the order they were picked. */
  selectedGames: string[];
  details: Record<string, GameProfile>;
  onUpdate: (slug: string, patch: ProfilePatch) => void;
}

/** Only Valorant has a rank lookup preview today. */
const GAMES_WITH_RANK_LOOKUP = new Set(["valorant"]);

/**
 * Deterministic stand-in for a real Riot API lookup. The same input always
 * "detects" the same rank, so it reads as a lookup rather than random noise.
 * Swap for a real fetch once there's a backend to call it from.
 */
function mockDetectRank(riotId: string, rankNames: string[]): string {
  let hash = 0;
  for (const char of riotId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return rankNames[hash % rankNames.length];
}

function GameCard({
  game,
  profile,
  onUpdate,
}: {
  game: GameInfo;
  profile: GameProfile;
  onUpdate: (patch: ProfilePatch) => void;
}) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");
  const hasRankLookup = GAMES_WITH_RANK_LOOKUP.has(game.slug);

  function handleDetect() {
    if (!profile.username.trim() || game.ranks.length === 0) return;
    setStatus("connecting");
    // Mocked: no backend to actually call Riot's API from yet.
    setTimeout(() => {
      onUpdate({
        rank: mockDetectRank(
          profile.username.trim(),
          game.ranks.map((rank) => rank.name),
        ),
      });
      setStatus("connected");
    }, 700);
  }

  return (
    <div className="flex flex-col gap-4">
      <GameDetailsFields
        game={game}
        profile={profile}
        onUpdate={onUpdate}
        size="md"
      />

      {hasRankLookup && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border-strong p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Or detect rank automatically (preview)
          </span>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-text-muted">
              Uses the username above as your Riot ID.
            </p>
            <button
              type="button"
              onClick={handleDetect}
              disabled={!profile.username.trim() || status === "connecting"}
              className="flex h-9 shrink-0 items-center justify-center rounded-lg border border-border-strong px-4 text-xs font-bold text-text-subtle transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "connecting" ? "Looking up…" : "Connect"}
            </button>
          </div>
          {status === "connected" && (
            <p className="text-xs text-brand">
              Connected {profile.rank} from {profile.username}. This is a
              preview, not a live lookup yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function RankRoleStep({
  catalog,
  selectedGames,
  details,
  onUpdate,
}: RankRoleStepProps) {
  const [activeGame, setActiveGame] = useState(selectedGames[0]);
  const slug = selectedGames.includes(activeGame) ? activeGame : selectedGames[0];
  const game = catalog.find((g) => g.slug === slug);
  const profile = details[slug] ?? emptyGameProfile;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-white">Rank and role</h2>
        <p className="text-sm text-text-muted">
          Helps lobbies find you for the right role, and keeps matches close
          in skill.
        </p>
      </div>

      {selectedGames.length > 1 && (
        <div className="flex flex-wrap items-center gap-5 border-b border-border-subtle">
          {selectedGames.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveGame(s)}
              className={`border-b-2 pb-2 text-sm font-semibold transition-colors ${
                s === slug
                  ? "border-brand text-white"
                  : "border-transparent text-text-muted hover:text-white"
              }`}
            >
              {catalog.find((g) => g.slug === s)?.name ?? s}
            </button>
          ))}
        </div>
      )}

      {game && (
        <GameCard
          key={slug}
          game={game}
          profile={profile}
          onUpdate={(patch) => onUpdate(slug, patch)}
        />
      )}
    </div>
  );
}
