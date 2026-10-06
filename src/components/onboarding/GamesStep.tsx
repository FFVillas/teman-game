"use client";

import { gameCoverFor } from "@/data/games";
import type { GameInfo } from "@/lib/games";

interface GamesStepProps {
  catalog: GameInfo[];
  /** Game slugs. */
  selected: string[];
  onToggle: (slug: string) => void;
}

export default function GamesStep({ catalog, selected, onToggle }: GamesStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-white">Which games do you play?</h2>
        <p className="text-sm text-text-muted">
          Pick as many as you want. This decides which lobbies show up first.
          You can always change this later.
        </p>
      </div>

      {catalog.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong p-4 text-center text-sm text-text-muted">
          Games can&apos;t be loaded right now. You can skip this step and add
          them later.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {catalog.map((game) => {
            const isSelected = selected.includes(game.slug);
            const cover = gameCoverFor(game.name);
            return (
              <button
                key={game.slug}
                type="button"
                onClick={() => onToggle(game.slug)}
                aria-pressed={isSelected}
                className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-colors ${
                  isSelected
                    ? "border-brand"
                    : "border-border-strong hover:border-white/30"
                }`}
              >
                <div className="relative h-20 w-full shrink-0 bg-bg-page">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- game cover thumbnail, no benefit from next/image optimization
                    <img src={cover} alt="" className="size-full object-cover" />
                  )}
                  <div
                    className={`absolute inset-0 transition-colors ${
                      isSelected ? "bg-brand/35" : "bg-black/25 group-hover:bg-black/10"
                    }`}
                  />
                  {isSelected && (
                    <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-brand">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                      <img
                        src="/icons/auth-check.svg"
                        alt=""
                        className="size-2.5 brightness-0 invert"
                      />
                    </span>
                  )}
                </div>
                <span className="px-2.5 py-2 text-xs font-bold text-white">
                  {game.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
