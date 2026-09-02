"use client";

import { games } from "@/data/games";

interface GamesStepProps {
  selected: string[];
  onToggle: (game: string) => void;
}

export default function GamesStep({ selected, onToggle }: GamesStepProps) {
  const selectable = games.filter((game) => !game.comingSoon);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-white">Which games do you play?</h2>
        <p className="text-sm text-text-muted">
          Pick as many as you want — this decides which lobbies show up first.
          You can always change this later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {selectable.map((game) => {
          const isSelected = selected.includes(game.name);
          return (
            <button
              key={game.name}
              type="button"
              onClick={() => onToggle(game.name)}
              aria-pressed={isSelected}
              className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-colors ${
                isSelected
                  ? "border-brand"
                  : "border-border-strong hover:border-white/30"
              }`}
            >
              <div className="relative h-20 w-full shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- game cover thumbnail, no benefit from next/image optimization */}
                <img src={game.image} alt="" className="size-full object-cover" />
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
    </div>
  );
}
