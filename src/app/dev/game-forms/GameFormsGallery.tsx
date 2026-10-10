"use client";

import { useEffect, useState } from "react";
import { regionsFor } from "@/data/game-regions";
import { fetchGameCatalog, type GameInfo } from "@/lib/games";
import { tiersOf } from "@/lib/ranks";
import { createClient } from "@/lib/supabase/client";
import { formatFor, sources } from "./formats";
import { NewBadge } from "./parts";
import { VariantA, VariantB, VariantC, VariantD } from "./variants";

// TEMPORARY (dev gallery): drafts of the per-game form (onboarding and edit
// profile). Everything below uses the real catalog: ranks, roles, regions and
// modes. Delete src/app/dev when the form is decided.

const variants = [
  {
    id: "a",
    name: "A. One card, smarter fields",
    best: "Edit profile (and a small step up from today)",
    note: "Today's form, kept as one card, but each game asks for its own ID format with a hint and a check, ranks stay a dropdown, roles gain a main role (★), and you can say which modes you play.",
  },
  {
    id: "b",
    name: "B. Guided steps",
    best: "Onboarding",
    note: "One question at a time: account, rank, role, how you play. A tier-then-division rank picker with the badges, skip on every step, and a progress row that shows what's done. Fewer fields on screen, more taps.",
  },
  {
    id: "c",
    name: "C. Form with a live preview",
    best: "Edit profile",
    note: "The form on the left, and on the right exactly how this game will look on your profile. Makes it obvious why each field matters and what an empty profile looks like.",
  },
  {
    id: "d",
    name: "D. All games in one list",
    best: "Edit profile with several games",
    note: "Every game is a collapsed row with a one-line summary and a pill for what's missing (\"Add rank\") or \"Complete\". Open one to edit. Adding a game is a button, not a dropdown. Switch the game tab above: this one ignores it, it shows all six.",
  },
];

export default function GameFormsGallery() {
  const [catalog, setCatalog] = useState<GameInfo[] | null>(null);
  const [slug, setSlug] = useState("valorant");

  useEffect(() => {
    let cancelled = false;
    fetchGameCatalog(createClient()).then((games) => {
      if (!cancelled) setCatalog(games);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (catalog === null) {
    return <p className="text-xs text-text-muted">Loading the game catalog…</p>;
  }
  if (catalog.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-default p-5 text-xs text-text-muted">
        The catalog didn&apos;t load (the page reads <code>games</code>,{" "}
        <code>game_ranks</code>, <code>game_roles</code> and{" "}
        <code>game_modes</code> from Supabase). Check the connection and reload.
      </p>
    );
  }

  const game = catalog.find((entry) => entry.slug === slug) ?? catalog[0];

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
          What each game needs from the player
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border-default">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-bg-card-alt text-[10px] uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2.5">Game</th>
                <th className="px-3 py-2.5">Account to enter</th>
                <th className="px-3 py-2.5">Ranks</th>
                <th className="px-3 py-2.5">Regions</th>
                <th className="px-3 py-2.5">Roles</th>
                <th className="px-3 py-2.5">Modes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {catalog.map((entry) => {
                const format = formatFor(entry.slug);
                return (
                  <tr key={entry.slug} className="align-top">
                    <td className="px-3 py-2.5 font-bold text-white">{entry.name}</td>
                    <td className="px-3 py-2.5 text-text-subtle">
                      {format.fields.map((field) => field.label).join(" + ")}
                      <span className="block text-[11px] text-text-muted">{format.where}</span>
                    </td>
                    <td className="px-3 py-2.5 text-text-subtle">
                      {entry.ranks.length} ranks, {tiersOf(entry.ranks).length} tiers
                    </td>
                    <td className="px-3 py-2.5 text-text-subtle">
                      {regionsFor(entry.slug).options.length}
                    </td>
                    <td className="px-3 py-2.5 text-text-subtle">
                      {entry.roles.length > 0 ? entry.roles.map((role) => role.name).join(", ") : "none"}
                    </td>
                    <td className="px-3 py-2.5 text-text-subtle">{entry.modes.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-1 text-xs leading-relaxed text-text-muted">
          <p>
            <span className="font-semibold text-text-subtle">Stored today:</span> in-game name
            (one text field), region, rank, roles. Several IDs are joined into that one field in
            these drafts (for example <code>Yonziii · 12345678 (1234)</code>).
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-text-subtle">Ideas that need a new column:</span>
            main role <NewBadge>needs a column</NewBadge> modes you play <NewBadge>needs a column</NewBadge>
            separate ID fields (searchable) <NewBadge>needs columns</NewBadge>
          </p>
          <p>
            <span className="font-semibold text-text-subtle">Left out on purpose:</span> peak rank
            (the reference notes say current rank only), hero or agent pools (no list in the
            catalog), and any &quot;verified&quot; mark (rank is self-reported).
          </p>
        </div>
      </section>

      <div className="sticky top-[60px] z-20 -mx-6 flex flex-wrap items-center gap-2 border-y border-border-default bg-bg-page/95 px-6 py-3 backdrop-blur">
        <span className="text-[11px] font-semibold text-text-muted">Game for A, B and C:</span>
        {catalog.map((entry) => (
          <button
            key={entry.slug}
            type="button"
            aria-pressed={entry.slug === game.slug}
            onClick={() => setSlug(entry.slug)}
            className={`flex h-8 items-center rounded-full border px-3.5 text-[11px] font-semibold transition-colors ${
              entry.slug === game.slug
                ? "border-brand bg-brand/10 text-white"
                : "border-border-strong text-text-muted hover:border-white/30 hover:text-white"
            }`}
          >
            {entry.name}
          </button>
        ))}
      </div>

      {variants.map((variant) => (
        <section key={variant.id} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
              {variant.name}
              <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">
                Best for: {variant.best}
              </span>
            </h2>
            <p className="max-w-[780px] text-xs leading-relaxed text-text-muted">{variant.note}</p>
          </div>
          {variant.id === "a" && <VariantA key={game.slug} game={game} />}
          {variant.id === "b" && <VariantB key={game.slug} game={game} />}
          {variant.id === "c" && <VariantC key={game.slug} game={game} />}
          {variant.id === "d" && <VariantD catalog={catalog} />}
        </section>
      ))}

      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
          Where the ID formats and field ideas come from
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-xs text-text-muted">
          {sources.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-text-muted">
          These are guides and news pages, not the publishers&apos; own docs. Check each format in
          the game before building it into validation.
        </p>
      </section>
    </div>
  );
}
