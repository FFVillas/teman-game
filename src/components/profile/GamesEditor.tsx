"use client";

import FormDropdown from "@/components/FormDropdown";
import { EmptyState } from "@/components/EmptyState";
import type { GameInfo } from "@/lib/games";
import { emptyGameProfile, type GameProfile } from "@/lib/game-profile";
import GameDetailsFields from "./GameDetailsFields";

/** One game on the form: which game, plus what the player entered for it. */
export interface GameDraft extends GameProfile {
  slug: string;
}

/**
 * Add, edit and remove the games on a profile.
 *
 * Everything is picked by the player: there is no Riot/Moonton API behind
 * this, so a "detected" rank would be a number we can't stand behind on a
 * profile whose whole point is being checkable. Ranks, roles and regions
 * come from the database catalog (`game_ranks`, `game_roles`) so every
 * profile uses the same ladder and the rank can be compared as a position,
 * not as typed text. A game with no roles (CS2, PUBG Mobile, Free Fire)
 * never asks for one.
 */
export default function GamesEditor({
  catalog,
  games,
  onChange,
}: {
  catalog: GameInfo[];
  games: GameDraft[];
  onChange: (games: GameDraft[]) => void;
}) {
  if (catalog.length === 0) {
    return (
      <EmptyState
        title="Games can't be loaded"
        description="Try again in a moment."
        size="sm"
      />
    );
  }

  const taken = new Set(games.map((game) => game.slug));
  const available = catalog.filter((game) => !taken.has(game.slug));

  function update(slug: string, patch: Partial<GameProfile>) {
    onChange(
      games.map((game) => (game.slug === slug ? { ...game, ...patch } : game)),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {games.length === 0 && (
        <EmptyState
          title="No games yet"
          description="Add the games you play so lobbies for them can find you."
          size="sm"
        />
      )}

      {games.map((draft) => {
        const game = catalog.find((entry) => entry.slug === draft.slug);
        if (!game) return null;

        return (
          <section
            key={draft.slug}
            className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-page p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-white">{game.name}</h3>
              <button
                type="button"
                onClick={() =>
                  onChange(games.filter((entry) => entry.slug !== draft.slug))
                }
                className="text-[11px] font-semibold text-text-muted transition-colors hover:text-danger"
              >
                Remove
              </button>
            </div>

            <GameDetailsFields
              game={game}
              profile={{ ...emptyGameProfile, ...draft }}
              onUpdate={(patch) => update(draft.slug, patch)}
            />
          </section>
        );
      })}

      {available.length > 0 && (
        // value stays "" so the dropdown resets after each pick
        <FormDropdown
          label="Add a game"
          placeholder="Add a game…"
          allowEmpty={false}
          value=""
          onChange={(slug) => {
            if (slug) {
              onChange([...games, { slug, ...emptyGameProfile }]);
            }
          }}
          options={available.map((game) => ({
            value: game.slug,
            label: game.name,
          }))}
        />
      )}
    </div>
  );
}
