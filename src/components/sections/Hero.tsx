import GameCard from "@/components/GameCard";
import { games } from "@/data/games";
import { heroContent } from "@/data/landing";

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-16 sm:pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-brand/15 blur-[150px]"
      />

      <div className="relative mx-auto flex max-w-[1000px] flex-col gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="max-w-[640px] text-2xl font-extrabold leading-[1.15] tracking-[-0.8px] text-white sm:text-[34px]">
            {heroContent.title}
          </h1>
          <p className="max-w-[560px] text-sm leading-relaxed text-text-muted sm:text-base">
            {heroContent.description}
          </p>
        </div>

        {/* The game picker is the primary action — each card routes into that
            game's LFG page, so it sits above the fold rather than further down. */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
              {heroContent.gamesLabel}
            </span>
            <span className="h-px flex-1 bg-border-default" />
          </div>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {games.map((game, index) => (
              <GameCard key={game.name} game={game} priority={index < 3} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
