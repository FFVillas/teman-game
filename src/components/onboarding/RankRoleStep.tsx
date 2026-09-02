"use client";

import { useState } from "react";
import { lfgRanks } from "@/data/lfg-ranks";
import { lfgRoles } from "@/data/lfg-roles";
import { regions, defaultRegion } from "@/data/regions";
import AuthField from "@/components/auth/AuthField";
import AuthSelect from "@/components/auth/AuthSelect";

export interface GameProfile {
  username: string;
  region: string;
  rank: string;
  /** Comma-separated — a real multi-select for Valorant, free text for
   *  everything else since there's no fixed role vocabulary to pick from. */
  role: string;
}

export const emptyGameProfile: GameProfile = {
  username: "",
  region: defaultRegion,
  rank: "",
  role: "",
};

/**
 * A plain object patch races against itself if two updates for the same
 * game fire before React re-renders (e.g. two role chips toggled in the
 * same tick) — each closure captures the same stale `profile`, so the
 * second overwrites the first instead of composing. The function form
 * always resolves against the latest state instead.
 */
type ProfilePatch = Partial<GameProfile> | ((current: GameProfile) => Partial<GameProfile>);

interface RankRoleStepProps {
  selectedGames: string[];
  details: Record<string, GameProfile>;
  onUpdate: (game: string, patch: ProfilePatch) => void;
}

const rankOptions = Object.values(lfgRanks).map((rank) => rank.name);
const roleOptions = Object.values(lfgRoles).map((role) => role.name);

/** Only Valorant has real rank/role data modeled today — see AGENTS.md. */
const GAMES_WITH_RANK_DATA = new Set(["Valorant"]);

function rolesToList(role: string): string[] {
  return role
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
}

/**
 * Deterministic stand-in for a real Riot API lookup — same input always
 * "detects" the same rank, so it reads as a lookup rather than random noise.
 * Swap for a real fetch once there's a backend to call it from.
 */
function mockDetectRank(riotId: string): string {
  let hash = 0;
  for (const char of riotId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return rankOptions[hash % rankOptions.length];
}

function UsernameAndRegion({
  game,
  profile,
  onUpdate,
}: {
  game: string;
  profile: GameProfile;
  onUpdate: (patch: ProfilePatch) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
      <AuthField
        label="In-game username"
        value={profile.username}
        onChange={(username) => onUpdate({ username })}
        placeholder={
          GAMES_WITH_RANK_DATA.has(game) ? "e.g. Yonziii#NA1" : "e.g. Yonziii"
        }
      />
      <AuthSelect
        label="Region"
        value={profile.region || defaultRegion}
        onChange={(region) => onUpdate({ region })}
        options={regions}
      />
    </div>
  );
}

function ValorantCard({
  profile,
  onUpdate,
}: {
  profile: GameProfile;
  onUpdate: (patch: ProfilePatch) => void;
}) {
  const [status, setStatus] = useState<"idle" | "detecting" | "detected">("idle");
  const selectedRoles = rolesToList(profile.role);

  function toggleRole(role: string) {
    onUpdate((current) => {
      const list = rolesToList(current.role);
      const next = list.includes(role)
        ? list.filter((r) => r !== role)
        : [...list, role];
      return { role: next.join(", ") };
    });
  }

  function handleDetect() {
    if (!profile.username.trim()) return;
    setStatus("detecting");
    // Mocked — no backend to actually call Riot's API from yet.
    setTimeout(() => {
      onUpdate({ rank: mockDetectRank(profile.username.trim()) });
      setStatus("detected");
    }, 700);
  }

  return (
    <div className="flex flex-col gap-4">
      <UsernameAndRegion game="Valorant" profile={profile} onUpdate={onUpdate} />

      <AuthSelect
        label="Rank"
        value={profile.rank || rankOptions[0]}
        onChange={(rank) => onUpdate({ rank })}
        options={rankOptions}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Roles you play
        </span>
        <div className="flex flex-wrap gap-2">
          {roleOptions.map((role) => {
            const isSelected = selectedRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                aria-pressed={isSelected}
                className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
                  isSelected
                    ? "border-brand text-brand"
                    : "border-border-strong text-text-muted hover:border-white/30"
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>

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
            disabled={!profile.username.trim() || status === "detecting"}
            className="flex h-9 shrink-0 items-center justify-center rounded-lg border border-border-strong px-4 text-xs font-bold text-text-subtle transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "detecting" ? "Looking up…" : "Detect"}
          </button>
        </div>
        {status === "detected" && (
          <p className="text-xs text-brand">
            Detected {profile.rank} from {profile.username} — this is a
            preview, not a live lookup yet.
          </p>
        )}
      </div>
    </div>
  );
}

function GenericCard({
  game,
  profile,
  onUpdate,
}: {
  game: string;
  profile: GameProfile;
  onUpdate: (patch: ProfilePatch) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-muted">
        Full rank support for {game} is coming soon — for now, just tell us
        roughly where you&apos;re at.
      </p>
      <UsernameAndRegion game={game} profile={profile} onUpdate={onUpdate} />
      <div className="grid grid-cols-2 gap-3">
        <AuthField
          label="Rank"
          value={profile.rank}
          onChange={(rank) => onUpdate({ rank })}
          placeholder="e.g. Diamond II, Mythic"
        />
        <AuthField
          label="Roles you play"
          value={profile.role}
          onChange={(role) => onUpdate({ role })}
          placeholder="e.g. Jungler, IGL"
        />
      </div>
    </div>
  );
}

export default function RankRoleStep({
  selectedGames,
  details,
  onUpdate,
}: RankRoleStepProps) {
  const [activeGame, setActiveGame] = useState(selectedGames[0]);
  const game = selectedGames.includes(activeGame) ? activeGame : selectedGames[0];
  const profile = details[game] ?? emptyGameProfile;
  const hasRankData = GAMES_WITH_RANK_DATA.has(game);

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
          {selectedGames.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setActiveGame(g)}
              className={`border-b-2 pb-2 text-sm font-semibold transition-colors ${
                g === game
                  ? "border-brand text-white"
                  : "border-transparent text-text-muted hover:text-white"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {hasRankData ? (
        <ValorantCard
          key={game}
          profile={profile}
          onUpdate={(patch) => onUpdate(game, patch)}
        />
      ) : (
        <GenericCard
          key={game}
          game={game}
          profile={profile}
          onUpdate={(patch) => onUpdate(game, patch)}
        />
      )}
    </div>
  );
}
