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

/**
 * The player picks their rank themselves. There used to be a "detect rank
 * automatically (preview)" button here, but with no Riot API behind it, it
 * made a rank up from the username and saved it as the player's real rank,
 * straight into the eligibility filter and the score. Game-account lookup is
 * outside the proposal's scope, so it was removed rather than kept as a mock.
 */
function GameCard({
  game,
  profile,
  onUpdate,
}: {
  game: GameInfo;
  profile: GameProfile;
  onUpdate: (patch: ProfilePatch) => void;
}) {
  return (
    <GameDetailsFields game={game} profile={profile} onUpdate={onUpdate} size="md" />
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
