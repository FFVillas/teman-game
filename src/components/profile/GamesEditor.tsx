"use client";

import FormDropdown from "@/components/FormDropdown";
import { EmptyState } from "@/components/EmptyState";
import { regions } from "@/data/regions";
import {
  emptyUserGame,
  type CatalogueGame,
  type UserGame,
} from "@/lib/user-games";
import { Field, controlClass } from "./DossierFields";

/**
 * Add, edit and remove the games on a profile.
 *
 * Ranks and roles are the database's own vocabulary (`game_ranks` ordered by
 * `ordinal`, `game_roles`), so a Valorant rank is always one of the 25 real
 * sub-ranks rather than free text — which is what makes rank distance
 * comparable between two players. Games with no roles defined (CS2, the
 * battle royales) simply don't show a role picker.
 *
 * Everything is typed in by the player: there is no Riot/Moonton API behind
 * this, and a "detected" rank we can't verify would undermine the point of a
 * profile other people are meant to trust.
 */
export default function GamesEditor({
  games,
  catalogue,
  onChange,
}: {
  games: UserGame[];
  catalogue: CatalogueGame[];
  onChange: (games: UserGame[]) => void;
}) {
  const taken = new Set(games.map((game) => game.gameId));
  const available = catalogue.filter((game) => !taken.has(game.id));

  function update(gameId: number, patch: Partial<UserGame>) {
    onChange(
      games.map((game) =>
        game.gameId === gameId ? { ...game, ...patch } : game
      )
    );
  }

  function toggleRole(gameId: number, roleId: number) {
    const game = games.find((entry) => entry.gameId === gameId);
    if (!game) return;
    update(gameId, {
      roleIds: game.roleIds.includes(roleId)
        ? game.roleIds.filter((id) => id !== roleId)
        : [...game.roleIds, roleId],
    });
  }

  if (catalogue.length === 0) {
    return (
      <EmptyState
        title="Game list unavailable"
        description="Couldn't load the game catalogue. Reload the page and try again."
        size="sm"
      />
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

      {games.map((game) => {
        const entry = catalogue.find((item) => item.id === game.gameId);

        return (
          <section
            key={game.gameId}
            className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-page p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-white">{game.name}</h3>
              <button
                type="button"
                onClick={() =>
                  onChange(games.filter((item) => item.gameId !== game.gameId))
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
                    update(game.gameId, { inGameName: event.target.value })
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
                  onChange={(region) => update(game.gameId, { region })}
                  options={regions.map((region) => ({
                    value: region,
                    label: region,
                  }))}
                />
              </Field>
            </div>

            <Field label="Rank">
              <FormDropdown
                label={`${game.name} rank`}
                placeholder="Not set"
                value={game.rankId === null ? "" : String(game.rankId)}
                onChange={(value) => {
                  const rank = entry?.ranks.find(
                    (option) => String(option.id) === value
                  );
                  update(game.gameId, {
                    rankId: rank?.id ?? null,
                    rankName: rank?.name ?? "",
                    rankOrdinal: rank?.ordinal ?? null,
                  });
                }}
                options={(entry?.ranks ?? []).map((rank) => ({
                  value: String(rank.id),
                  label: rank.name,
                }))}
              />
            </Field>

            {entry && entry.roles.length > 0 && (
              <Field label="Roles you play">
                <div className="flex flex-wrap gap-1.5">
                  {entry.roles.map((role) => {
                    const isSelected = game.roleIds.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(game.gameId, role.id)}
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
          onChange={(value) => {
            const game = catalogue.find((item) => String(item.id) === value);
            if (game) onChange([...games, emptyUserGame(game)]);
          }}
          options={available.map((game) => ({
            value: String(game.id),
            label: game.name,
          }))}
        />
      )}
    </div>
  );
}
