"use client";

import { useState, type ReactNode } from "react";
import { NotSet } from "@/components/EmptyState";
import GameDetailsFields from "@/components/profile/GameDetailsFields";
import { emptyGameProfile, type GameProfile } from "@/lib/game-profile";
import { gameCoverFor } from "@/data/games";
import { regionLabel } from "@/data/game-regions";
import { roleIconFor } from "@/data/role-icons";
import type { GameInfo } from "@/lib/games";
import { composeIgn, formatFor } from "./formats";
import {
  Field,
  IdentityFields,
  ModePicker,
  NewBadge,
  RankDropdown,
  RankLadder,
  RankMark,
  RegionPicker,
  RolePicker,
  emptyDraft,
  type Draft,
  type SetDraft,
} from "./parts";

// TEMPORARY (dev gallery): four drafts of the per-game form. Delete
// src/app/dev when the form is decided.

function useDraft() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const set: SetDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));
  return [draft, set] as const;
}

const card = "flex flex-col gap-5 rounded-2xl border border-border-strong bg-bg-card-alt p-5";

function GameHeader({ game }: { game: GameInfo }) {
  const cover = gameCoverFor(game.name);
  return (
    <div className="flex items-center gap-3">
      <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-bg-page">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- game cover thumbnail, no benefit from next/image optimization
          <img src={cover} alt="" className="size-full object-cover object-top" />
        )}
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-white">{game.name}</span>
        <span className="text-[11px] text-text-muted">
          {game.platform === "mobile" ? "Mobile" : "PC"} · {game.genre}
        </span>
      </div>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-[11px] leading-relaxed text-text-muted">{children}</p>;
}

// ─────────────────────────────────────────────────────────────────────────
// A. One card, smarter fields: today's form with per-game ID formats, a
//    main role, and the modes you play.
// ─────────────────────────────────────────────────────────────────────────
export function VariantA({ game }: { game: GameInfo }) {
  // The real form, as built (shared by onboarding and edit profile).
  const [profile, setProfile] = useState<GameProfile>(emptyGameProfile);
  return (
    <div className={card}>
      <GameHeader game={game} />
      <GameDetailsFields
        game={game}
        profile={profile}
        onUpdate={(patch) => setProfile((current) => ({ ...current, ...patch }))}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// B. Guided steps: one question at a time, built for onboarding.
// ─────────────────────────────────────────────────────────────────────────
export function VariantB({ game }: { game: GameInfo }) {
  const [draft, set] = useDraft();
  const steps = [
    { id: "account", title: "Account" },
    { id: "rank", title: "Rank" },
    ...(game.roles.length > 0 ? [{ id: "role", title: "Role" }] : []),
    { id: "play", title: "How you play" },
  ];
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;

  const done: Record<string, boolean> = {
    account: Boolean(draft.ign.trim()),
    rank: Boolean(draft.rank),
    role: draft.roles.length > 0,
    play: draft.modes.length > 0,
  };

  return (
    <div className={card}>
      <GameHeader game={game} />

      <ol className="flex items-center gap-2">
        {steps.map((entry, position) => (
          <li key={entry.id} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => setIndex(position)}
              aria-current={position === index}
              className="flex items-center gap-2"
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  position === index
                    ? "bg-brand text-white"
                    : done[entry.id]
                      ? "bg-success text-white"
                      : "border border-border-strong text-text-muted"
                }`}
              >
                {done[entry.id] && position !== index ? "✓" : position + 1}
              </span>
              <span
                className={`hidden text-[11px] font-semibold sm:inline ${
                  position === index ? "text-white" : "text-text-muted"
                }`}
              >
                {entry.title}
              </span>
            </button>
            {position < steps.length - 1 && <span className="h-px flex-1 bg-border-default" />}
          </li>
        ))}
      </ol>

      <div className="flex min-h-[210px] flex-col gap-4">
        {step.id === "account" && (
          <>
            <h4 className="text-sm font-bold text-white">What&apos;s your {formatFor(game.slug).fields[0].label}?</h4>
            <IdentityFields game={game} draft={draft} set={set} />
          </>
        )}
        {step.id === "rank" && (
          <>
            <h4 className="text-sm font-bold text-white">What&apos;s your current rank?</h4>
            <RankLadder game={game} draft={draft} set={set} />
            <Hint>Not sure? Skip it. You can add it any time, and it&apos;s never shown as verified.</Hint>
          </>
        )}
        {step.id === "role" && (
          <>
            <h4 className="text-sm font-bold text-white">Which roles do you play?</h4>
            <RolePicker game={game} draft={draft} set={set} withPrimary />
          </>
        )}
        {step.id === "play" && (
          <>
            <h4 className="text-sm font-bold text-white">Where and how do you play?</h4>
            <Field label="Region">
              <RegionPicker game={game} draft={draft} set={set} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Modes you play <NewBadge />
              </span>
              <ModePicker game={game} draft={draft} set={set} />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((n) => Math.max(0, n - 1))}
          className="text-xs font-semibold text-text-muted transition-colors hover:text-white disabled:opacity-30"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          {!last && (
            <button
              type="button"
              onClick={() => setIndex((n) => n + 1)}
              className="text-xs font-semibold text-text-muted transition-colors hover:text-white"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={() => setIndex((n) => Math.min(steps.length - 1, n + 1))}
            className="flex h-9 items-center rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            {last ? "Save game" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// C. Form with a live preview of how the game shows on the profile.
// ─────────────────────────────────────────────────────────────────────────
function ProfilePreview({ game, draft }: { game: GameInfo; draft: Draft }) {
  const rank = game.ranks.find((entry) => entry.name === draft.rank);
  const name = composeIgn(game.slug, draft);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-bg-page p-5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
        How it looks on your profile
      </span>
      <div className="flex items-center gap-4">
        {rank ? (
          <RankMark game={game} rank={rank} className="size-14" />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-xl border border-dashed border-border-default text-[10px] text-text-muted">
            Unranked
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-tight text-text-muted">
            {game.name}
          </span>
          {name ? (
            <span className="truncate text-sm font-bold text-white">{name}</span>
          ) : (
            <NotSet label={`${formatFor(game.slug).fields[0].label} not set`} />
          )}
          <span className="text-xs text-text-subtle">
            {rank ? rank.name : "Rank not set"}
            {draft.region && ` · ${regionLabel(game.slug, draft.region)}`}
          </span>
        </div>
      </div>

      {game.roles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-tight text-text-muted">Roles</span>
          {draft.roles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {draft.roles.map((role) => {
                const icon = roleIconFor(game.slug, role);
                return (
                  <span
                    key={role}
                    className="flex items-center gap-1.5 rounded-full border border-border-strong px-2.5 py-1 text-[11px] text-white"
                  >
                    {icon && (
                      // eslint-disable-next-line @next/next/no-img-element -- static icon, no benefit from next/image optimization
                      <img src={icon} alt="" className="size-3.5" />
                    )}
                    {role}
                    {draft.primary === role && draft.roles.length > 1 && (
                      <span className="text-star">★</span>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <NotSet />
          )}
        </div>
      )}

      {draft.modes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-tight text-text-muted">Plays</span>
          <span className="text-xs text-white">
            {game.modes
              .filter((mode) => draft.modes.includes(mode.value))
              .map((mode) => mode.label)
              .join(" · ")}
          </span>
        </div>
      )}
    </div>
  );
}

export function VariantC({ game }: { game: GameInfo }) {
  const [draft, set] = useDraft();
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
      <div className={card}>
        <GameHeader game={game} />
        <IdentityFields game={game} draft={draft} set={set} />
        <Field label="Rank">
          <RankLadder game={game} draft={draft} set={set} />
        </Field>
        {game.roles.length > 0 && (
          <Field label="Roles you play">
            <RolePicker game={game} draft={draft} set={set} withPrimary />
          </Field>
        )}
        <Field label="Region">
          <RegionPicker game={game} draft={draft} set={set} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-text-muted">
            Modes you play <NewBadge />
          </span>
          <ModePicker game={game} draft={draft} set={set} />
        </div>
      </div>
      <div className="lg:sticky lg:top-20">
        <ProfilePreview game={game} draft={draft} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// D. All games in one list: collapsed rows with a one-line summary, open one
//    to edit. Built for the edit-profile page with several games.
// ─────────────────────────────────────────────────────────────────────────
function summary(game: GameInfo, draft: Draft): string {
  const bits = [
    composeIgn(game.slug, draft),
    draft.rank,
    draft.roles.length > 0 ? draft.roles.join(", ") : "",
  ].filter(Boolean);
  return bits.length > 0 ? bits.join(" · ") : "Nothing filled in yet";
}

/** What is still missing, shown as a pill so incomplete games stand out. */
function missing(game: GameInfo, draft: Draft): string[] {
  const out: string[] = [];
  if (!draft.ign.trim()) out.push(formatFor(game.slug).fields[0].label);
  if (!draft.rank) out.push("rank");
  if (game.roles.length > 0 && draft.roles.length === 0) out.push("role");
  return out;
}

export function VariantD({ catalog }: { catalog: GameInfo[] }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [open, setOpen] = useState<string | null>(null);
  const added = catalog.filter((game) => drafts[game.slug]);
  const notAdded = catalog.filter((game) => !drafts[game.slug]);

  const setFor = (slug: string): SetDraft => (patch) =>
    setDrafts((current) => ({ ...current, [slug]: { ...current[slug], ...patch } }));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col overflow-hidden rounded-2xl border border-border-strong bg-bg-card-alt">
        {added.length === 0 && (
          <li className="px-5 py-8 text-center text-xs text-text-muted">
            No games yet. Add the games you play below.
          </li>
        )}
        {added.map((game) => {
          const draft = drafts[game.slug];
          const gaps = missing(game, draft);
          const isOpen = open === game.slug;
          const cover = gameCoverFor(game.name);
          return (
            <li key={game.slug} className="border-b border-border-default last:border-b-0">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : game.slug)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-bg-page">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- game cover thumbnail, no benefit from next/image optimization
                    <img src={cover} alt="" className="size-full object-cover object-top" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-xs font-bold text-white">{game.name}</span>
                  <span className="truncate text-[11px] text-text-muted">{summary(game, draft)}</span>
                </span>
                {gaps.length > 0 ? (
                  <span className="shrink-0 rounded bg-star/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-star">
                    Add {gaps[0]}
                  </span>
                ) : (
                  <span className="shrink-0 rounded bg-success/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-success">
                    Complete
                  </span>
                )}
                <span className={`text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}>⌄</span>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-4 border-t border-border-default bg-bg-page/60 px-5 py-5">
                  <IdentityFields game={game} draft={draft} set={setFor(game.slug)} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Region">
                      <RegionPicker game={game} draft={draft} set={setFor(game.slug)} />
                    </Field>
                    <Field label="Rank">
                      <RankDropdown game={game} draft={draft} set={setFor(game.slug)} />
                    </Field>
                  </div>
                  {game.roles.length > 0 && (
                    <Field label="Roles you play">
                      <RolePicker game={game} draft={draft} set={setFor(game.slug)} withPrimary />
                    </Field>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDrafts((current) => {
                        const next = { ...current };
                        delete next[game.slug];
                        return next;
                      });
                      setOpen(null);
                    }}
                    className="self-start text-[11px] font-semibold text-text-muted transition-colors hover:text-danger"
                  >
                    Remove {game.name}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {notAdded.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-text-muted">Add a game</span>
          {notAdded.map((game) => (
            <button
              key={game.slug}
              type="button"
              onClick={() => {
                setDrafts((current) => ({
                  ...current,
                  [game.slug]: { ...emptyDraft, region: "" },
                }));
                setOpen(game.slug);
              }}
              className="flex h-8 items-center rounded-full border border-border-strong px-3.5 text-[11px] font-semibold text-text-subtle transition-colors hover:border-brand/60 hover:text-white"
            >
              + {game.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
