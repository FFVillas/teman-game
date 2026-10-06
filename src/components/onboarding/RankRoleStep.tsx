"use client";

import { useState } from "react";
import { regions, defaultRegion } from "@/data/regions";
import AuthField from "@/components/auth/AuthField";
import AuthSelect from "@/components/auth/AuthSelect";
import FormDropdown from "@/components/FormDropdown";
import type { CatalogueGame } from "@/lib/user-games";

/**
 * What a player tells us about one game. Rank and roles are ids from the
 * database catalogue (`game_ranks`, `game_roles`) rather than free text, so
 * the profile and the matching score read the same vocabulary — and the
 * rank's `ordinal` gives the rank-distance penalty something to measure.
 */
export interface GameProfile {
  username: string;
  region: string;
  rankId: number | null;
  roleIds: number[];
}

export const emptyGameProfile: GameProfile = {
  username: "",
  region: defaultRegion,
  rankId: null,
  roleIds: [],
};

/**
 * A plain object patch races against itself if two updates for the same
 * game fire before React re-renders (e.g. two role chips toggled in the
 * same tick) — each closure captures the same stale `profile`, so the
 * second overwrites the first instead of composing. The function form
 * always resolves against the latest state instead.
 */
type ProfilePatch =
  | Partial<GameProfile>
  | ((current: GameProfile) => Partial<GameProfile>);

interface RankRoleStepProps {
  selectedGames: string[];
  details: Record<string, GameProfile>;
  catalogue: CatalogueGame[];
  onUpdate: (game: string, patch: ProfilePatch) => void;
}

function GameCard({
  entry,
  profile,
  onUpdate,
}: {
  entry: CatalogueGame;
  profile: GameProfile;
  onUpdate: (patch: ProfilePatch) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
        <AuthField
          label="In-game username"
          value={profile.username}
          onChange={(username) => onUpdate({ username })}
          placeholder={
            entry.slug === "valorant" ? "e.g. Yonziii#SG2" : "e.g. Yonziii"
          }
        />
        <AuthSelect
          label="Region"
          value={profile.region || defaultRegion}
          onChange={(region) => onUpdate({ region })}
          options={regions}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Rank
        </span>
        <FormDropdown
          label={`${entry.name} rank`}
          placeholder="Not set"
          value={profile.rankId === null ? "" : String(profile.rankId)}
          onChange={(value) =>
            onUpdate({ rankId: value ? Number(value) : null })
          }
          options={entry.ranks.map((rank) => ({
            value: String(rank.id),
            label: rank.name,
          }))}
        />
        <p className="text-[11px] text-text-muted">
          You tell us this — nothing is read from the game, so keep it
          accurate and teammates can rely on it.
        </p>
      </div>

      {entry.roles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Roles you play
          </span>
          <div className="flex flex-wrap gap-2">
            {entry.roles.map((role) => {
              const isSelected = profile.roleIds.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() =>
                    onUpdate((current) => ({
                      roleIds: current.roleIds.includes(role.id)
                        ? current.roleIds.filter((id) => id !== role.id)
                        : [...current.roleIds, role.id],
                    }))
                  }
                  aria-pressed={isSelected}
                  className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? "border-brand text-brand"
                      : "border-border-strong text-text-muted hover:border-white/30"
                  }`}
                >
                  {role.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RankRoleStep({
  selectedGames,
  details,
  catalogue,
  onUpdate,
}: RankRoleStepProps) {
  const [activeGame, setActiveGame] = useState(selectedGames[0]);
  const game = selectedGames.includes(activeGame)
    ? activeGame
    : selectedGames[0];
  const entry = catalogue.find((item) => item.name === game);
  const profile = details[game] ?? emptyGameProfile;

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
          {selectedGames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveGame(name)}
              className={`border-b-2 pb-2 text-sm font-semibold transition-colors ${
                name === game
                  ? "border-brand text-white"
                  : "border-transparent text-text-muted hover:text-white"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {entry ? (
        <GameCard
          key={game}
          entry={entry}
          profile={profile}
          onUpdate={(patch) => onUpdate(game, patch)}
        />
      ) : (
        <p className="text-xs text-text-muted">
          Loading {game}&apos;s ranks and roles…
        </p>
      )}
    </div>
  );
}
