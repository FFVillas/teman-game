"use client";

import FormDropdown from "@/components/FormDropdown";
import { EmptyState } from "@/components/EmptyState";
import { regionsFor } from "@/data/game-regions";
import type { GameInfo } from "@/lib/games";
import {
  emptyGameProfile,
  type GameProfile,
} from "@/components/onboarding/RankRoleStep";
import { Field, controlClass } from "./DossierFields";

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

  function toggleRole(slug: string, role: string) {
    const game = games.find((entry) => entry.slug === slug);
    if (!game) return;
    update(slug, {
      roles: game.roles.includes(role)
        ? game.roles.filter((item) => item !== role)
        : [...game.roles, role],
    });
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
        const regionList = regionsFor(game.slug);

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

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="In-game name">
                <input
                  value={draft.username}
                  onChange={(event) =>
                    update(draft.slug, { username: event.target.value })
                  }
                  maxLength={40}
                  placeholder={
                    game.slug === "valorant" ? "e.g. Yonziii#SG2" : "e.g. Yonziii"
                  }
                  className={controlClass}
                />
              </Field>

              <Field label="Region">
                <FormDropdown
                  label={`${game.name} region`}
                  value={draft.region || regionList.default}
                  onChange={(region) => update(draft.slug, { region })}
                  options={regionList.options}
                  allowEmpty={false}
                />
              </Field>
            </div>

            <Field label="Rank">
              <FormDropdown
                label={`${game.name} rank`}
                placeholder="Not sure yet"
                value={draft.rank}
                onChange={(rank) => update(draft.slug, { rank })}
                options={game.ranks.map((rank) => ({
                  value: rank.name,
                  label: rank.name,
                }))}
              />
            </Field>

            {game.roles.length > 0 && (
              <Field label="Roles you play">
                <div className="flex flex-wrap gap-1.5">
                  {game.roles.map((role) => {
                    const isSelected = draft.roles.includes(role.name);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(draft.slug, role.name)}
                        aria-pressed={isSelected}
                        className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                          isSelected
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border-strong text-text-muted hover:border-white/30"
                        }`}
                      >
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
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
