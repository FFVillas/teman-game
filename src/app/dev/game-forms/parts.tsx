"use client";

import { useMemo, useState } from "react";
import FormDropdown from "@/components/FormDropdown";
import { regionsFor } from "@/data/game-regions";
import { rankIconFor } from "@/data/rank-icons";
import { roleIconFor } from "@/data/role-icons";
import { Field, controlClass, labelClass } from "@/components/profile/DossierFields";
import type { GameInfo, GameRank } from "@/lib/games";
import { tiersOf } from "@/lib/ranks";
import { formatFor, type IdentityKey } from "./formats";

// TEMPORARY (dev gallery): shared pieces for the game-form drafts.

/** What a player enters for one game in these drafts. */
export interface Draft {
  ign: string;
  id: string;
  zone: string;
  region: string;
  /** Rank name, "" = not set. */
  rank: string;
  roles: string[];
  /** The role they most want, one of `roles`. */
  primary: string;
  /** Mode values from `game_modes` they like to play. */
  modes: string[];
}

export const emptyDraft: Draft = {
  ign: "",
  id: "",
  zone: "",
  region: "",
  rank: "",
  roles: [],
  primary: "",
  modes: [],
};

export type SetDraft = (patch: Partial<Draft>) => void;

export const chipClass = (active: boolean) =>
  `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
    active
      ? "border-brand bg-brand/10 text-brand"
      : "border-border-strong text-text-muted hover:border-white/30 hover:text-white"
  }`;

/** A tag for fields that don't exist in the database yet. */
export function NewBadge({ children = "needs a new column" }: { children?: string }) {
  return (
    <span className="rounded bg-star/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-star">
      {children}
    </span>
  );
}

export function IdentityFields({
  game,
  draft,
  set,
}: {
  game: GameInfo;
  draft: Draft;
  set: SetDraft;
}) {
  const format = formatFor(game.slug);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-2">
        {format.fields.map((field) => {
          const value = draft[field.key as IdentityKey];
          const invalid = Boolean(value && field.pattern && !field.pattern.test(value.trim()));
          return (
            <div
              key={field.key}
              className={`flex flex-col gap-1.5 ${
                format.fields.length === 1 ? "sm:col-span-2" : ""
              }`}
            >
              <span className={labelClass}>{field.label}</span>
              <input
                value={value}
                onChange={(event) => set({ [field.key]: event.target.value })}
                inputMode={field.numeric ? "numeric" : undefined}
                placeholder={field.placeholder}
                maxLength={40}
                aria-invalid={invalid}
                className={`${controlClass} ${invalid ? "border-danger focus:ring-danger" : ""}`}
              />
              {invalid && field.error && (
                <span className="text-[11px] text-danger">{field.error}</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] leading-relaxed text-text-muted">
        <span className="font-semibold text-text-subtle">Where to find it:</span>{" "}
        {format.where}
        {format.note && ` ${format.note}`}
      </p>
    </div>
  );
}

/** Chips for short lists, a dropdown for long ones (League has 14 servers). */
export function RegionPicker({
  game,
  draft,
  set,
}: {
  game: GameInfo;
  draft: Draft;
  set: SetDraft;
}) {
  const list = regionsFor(game.slug);
  const value = draft.region || list.default;
  if (list.options.length > 6) {
    return (
      <FormDropdown
        label={`${game.name} region`}
        value={value}
        onChange={(region) => set({ region })}
        options={list.options}
        allowEmpty={false}
      />
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => set({ region: option.value })}
          className={chipClass(value === option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The existing control: one long dropdown of every rank. */
export function RankDropdown({
  game,
  draft,
  set,
}: {
  game: GameInfo;
  draft: Draft;
  set: SetDraft;
}) {
  return (
    <FormDropdown
      label={`${game.name} rank`}
      placeholder="Not sure yet"
      value={draft.rank}
      onChange={(rank) => set({ rank })}
      options={game.ranks.map((rank) => ({ value: rank.name, label: rank.name }))}
    />
  );
}

/** A rank's badge art when the game has some, otherwise a small tile with its initial. */
export function RankMark({
  game,
  rank,
  className = "size-8",
}: {
  game: GameInfo;
  rank: Pick<GameRank, "name" | "tier">;
  className?: string;
}) {
  const icon = rankIconFor(game.slug, rank);
  return icon ? (
    // eslint-disable-next-line @next/next/no-img-element -- rank badge art, no benefit from next/image optimization
    <img src={icon} alt="" className={`${className} object-contain`} />
  ) : (
    <span
      className={`${className} flex items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-bold text-text-subtle`}
    >
      {rank.tier.charAt(0)}
    </span>
  );
}

/**
 * Tier first, then division: pick "Gold", then "Gold 2". Far fewer rows to
 * scan than a 24-item list, and the badges are what players recognise.
 * Tiers with a single rank (Radiant, Legend…) are picked in one tap.
 */
export function RankLadder({
  game,
  draft,
  set,
}: {
  game: GameInfo;
  draft: Draft;
  set: SetDraft;
}) {
  const tiers = useMemo(() => tiersOf(game.ranks), [game]);
  const current = game.ranks.find((rank) => rank.name === draft.rank);
  // The tier can be chosen before the division, so it is remembered here; once
  // a rank is set, its own tier wins.
  const [pickedTier, setPickedTier] = useState(current?.tier ?? "");
  const activeTier = tiers.find((tier) => tier.name === (current?.tier ?? pickedTier));
  const divisions = activeTier
    ? game.ranks.filter((rank) => rank.tier === activeTier.name)
    : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={!activeTier}
          onClick={() => {
            setPickedTier("");
            set({ rank: "" });
          }}
          className={chipClass(!activeTier)}
        >
          Not sure yet
        </button>
        {tiers.map((tier) => {
          const ranks = game.ranks.filter((rank) => rank.tier === tier.name);
          // The middle division's art stands in for the tier (as on lobby cards).
          const stand = ranks[Math.floor(ranks.length / 2)];
          const selected = activeTier?.name === tier.name;
          return (
            <button
              key={tier.name}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setPickedTier(tier.name);
                if (ranks.length === 1) set({ rank: ranks[0].name });
                else if (current?.tier !== tier.name) set({ rank: "" });
              }}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                selected
                  ? "border-brand bg-brand/10 text-white"
                  : "border-border-strong text-text-muted hover:border-white/30 hover:text-white"
              }`}
            >
              <RankMark game={game} rank={stand} className="size-6" />
              {tier.name}
            </button>
          );
        })}
      </div>
      {divisions.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-text-muted">Division</span>
          {divisions.map((rank) => (
            <button
              key={rank.id}
              type="button"
              aria-pressed={draft.rank === rank.name}
              onClick={() => set({ rank: rank.name })}
              className={chipClass(draft.rank === rank.name)}
            >
              {rank.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Roles with their icons; with `withPrimary`, one can be starred as the main. */
export function RolePicker({
  game,
  draft,
  set,
  withPrimary = false,
}: {
  game: GameInfo;
  draft: Draft;
  set: SetDraft;
  withPrimary?: boolean;
}) {
  if (game.roles.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-default px-3 py-2.5 text-[11px] text-text-muted">
        {game.name} has no assigned roles, so nothing to pick here.
      </p>
    );
  }

  function toggle(name: string) {
    const roles = draft.roles.includes(name)
      ? draft.roles.filter((role) => role !== name)
      : [...draft.roles, name];
    set({
      roles,
      primary: roles.includes(draft.primary) ? draft.primary : (roles[0] ?? ""),
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {game.roles.map((role) => {
        const selected = draft.roles.includes(role.name);
        const icon = roleIconFor(game.slug, role.name);
        const isPrimary = withPrimary && selected && draft.primary === role.name;
        return (
          <span key={role.id} className="inline-flex items-center">
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(role.name)}
              className={chipClass(selected)}
            >
              {icon && (
                // eslint-disable-next-line @next/next/no-img-element -- static icon, no benefit from next/image optimization
                <img src={icon} alt="" className="size-3.5" />
              )}
              {role.name}
            </button>
            {withPrimary && selected && draft.roles.length > 1 && (
              <button
                type="button"
                aria-label={`Make ${role.name} your main role`}
                aria-pressed={isPrimary}
                onClick={() => set({ primary: role.name })}
                className={`-ml-1.5 flex size-6 items-center justify-center rounded-full border text-[11px] transition-colors ${
                  isPrimary
                    ? "border-star bg-star/20 text-star"
                    : "border-border-strong text-text-muted hover:text-star"
                }`}
              >
                ★
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Which of the game's modes they like (`game_modes`). A new field for the profile. */
export function ModePicker({
  game,
  draft,
  set,
}: {
  game: GameInfo;
  draft: Draft;
  set: SetDraft;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {game.modes.map((mode) => {
        const selected = draft.modes.includes(mode.value);
        return (
          <button
            key={mode.id}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              set({
                modes: selected
                  ? draft.modes.filter((value) => value !== mode.value)
                  : [...draft.modes, mode.value],
              })
            }
            className={chipClass(selected)}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

export { Field };
