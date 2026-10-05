"use client";

import FormDropdown from "@/components/FormDropdown";
import { EmptyState } from "@/components/EmptyState";
import {
  gameRankOptions,
  gameRoleOptions,
  playableGames,
} from "@/data/games";
import { regions } from "@/data/regions";
import { emptyUserGame, type UserGame } from "@/lib/user-games";
import { Field, controlClass } from "./DossierFields";

/**
 * Add, edit and remove the games on a profile.
 *
 * Everything is typed in by the player: there is no Riot/Moonton API behind
 * this, so a "detected" rank would be a number we can't stand behind on a
 * profile whose whole point is being checkable. Where a game publishes a
 * fixed ladder (Valorant, League, Mobile Legends) the rank and role are
 * dropdowns so profiles stay comparable; the rest take free text, because a
 * CS2 Premier rating or a battle-royale season tier doesn't fit a fixed list.
 */
export default function GamesEditor({
  games,
  onChange,
}: {
  games: UserGame[];
  onChange: (games: UserGame[]) => void;
}) {
  const taken = new Set(games.map((game) => game.slug));
  const available = playableGames.filter((game) => !taken.has(game.slug));

  function update(slug: string, patch: Partial<UserGame>) {
    onChange(
      games.map((game) => (game.slug === slug ? { ...game, ...patch } : game))
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

      {games.map((game) => {
        const rankChoices = gameRankOptions[game.slug];
        const roleChoices = gameRoleOptions[game.slug];

        return (
          <section
            key={game.slug}
            className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-page p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-white">{game.name}</h3>
              <button
                type="button"
                onClick={() =>
                  onChange(games.filter((entry) => entry.slug !== game.slug))
                }
                className="text-[11px] font-semibold text-text-muted transition-colors hover:text-danger"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="In-game name">
                <input
                  value={game.inGameName}
                  onChange={(event) =>
                    update(game.slug, { inGameName: event.target.value })
                  }
                  placeholder={
                    game.slug === "valorant" ? "e.g. Yonziii#SG2" : "e.g. Yonziii"
                  }
                  className={controlClass}
                />
              </Field>

              <Field label="Region">
                <FormDropdown
                  label={`${game.name} region`}
                  placeholder="Not set"
                  value={game.region}
                  onChange={(region) => update(game.slug, { region })}
                  options={regions.map((region) => ({
                    value: region,
                    label: region,
                  }))}
                />
              </Field>
            </div>

            <Field label="Rank">
              {rankChoices ? (
                <FormDropdown
                  label={`${game.name} rank`}
                  placeholder="Not set"
                  value={game.rank}
                  onChange={(rank) => update(game.slug, { rank })}
                  options={rankChoices.map((rank) => ({
                    value: rank,
                    label: rank,
                  }))}
                />
              ) : (
                <input
                  value={game.rank}
                  onChange={(event) =>
                    update(game.slug, { rank: event.target.value })
                  }
                  placeholder="e.g. 15,000 Premier · Conqueror"
                  className={controlClass}
                />
              )}
            </Field>

            <Field label="Roles you play">
              {roleChoices ? (
                <div className="flex flex-wrap gap-1.5">
                  {roleChoices.map((role) => {
                    const isSelected = game.roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(game.slug, role)}
                        aria-pressed={isSelected}
                        className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                          isSelected
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border-strong text-text-muted hover:border-white/30"
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  value={game.roles.join(", ")}
                  onChange={(event) =>
                    update(game.slug, {
                      roles: event.target.value
                        .split(",")
                        .map((role) => role.trim())
                        .filter(Boolean)
                        .slice(0, 6),
                    })
                  }
                  placeholder="e.g. Entry, IGL"
                  className={controlClass}
                />
              )}
            </Field>
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
            if (slug) onChange([...games, emptyUserGame(slug)]);
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
