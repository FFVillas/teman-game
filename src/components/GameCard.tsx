import Image from "next/image";
import type { Game } from "@/data/games";

export default function GameCard({ game }: { game: Game }) {
  if (game.comingSoon) {
    return (
      <div className="flex w-full flex-col items-start">
        <div className="relative flex h-[320px] w-full items-center justify-center overflow-clip rounded-2xl border border-border-strong bg-bg-card-alt">
          <p className="text-center text-2xl font-bold leading-[27px] text-white/15">
            COMING
            <br />
            SOON
          </p>
        </div>
        <div className="flex w-full flex-col items-start py-1">
          <div className="w-full pt-1">
            <p className="text-base font-bold leading-[27px] text-white">
              COMING SOON
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start">
      <div className="flex h-[320px] w-full items-center justify-center overflow-clip rounded-2xl bg-bg-card">
        <div className="relative h-full w-full">
          <Image
            src={game.image}
            alt={game.name}
            fill
            sizes="(min-width: 1024px) 215px, 45vw"
            className="object-cover"
          />
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-1 py-1">
        <div className="w-full pt-1">
          <h3 className="truncate text-base font-bold leading-[27px] text-white">
            {game.name}
          </h3>
        </div>
        <div className="flex w-full items-center gap-2">
          <Image src="/icons/people-small.svg" alt="" width={16} height={12} />
          <p className="whitespace-nowrap text-xs tracking-[0.05px] text-text-muted">
            {game.activeLfg}
          </p>
        </div>
      </div>
    </div>
  );
}
