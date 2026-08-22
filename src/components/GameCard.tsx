import Image from "next/image";
import Link from "next/link";
import type { Game } from "@/data/games";

export default function GameCard({
  game,
  priority = false,
}: {
  game: Game;
  priority?: boolean;
}) {
  if (game.comingSoon) {
    return (
      <div className="flex w-full flex-col items-start">
        <div className="flex aspect-[2/3] w-full items-center justify-center overflow-clip rounded-2xl border border-dashed border-border-strong bg-bg-card-alt">
          <p className="text-center text-lg font-bold leading-tight text-white/15">
            COMING
            <br />
            SOON
          </p>
        </div>
        <div className="flex w-full flex-col items-start gap-1 py-1">
          <div className="w-full pt-1">
            <h3 className="truncate text-base font-bold leading-[27px] text-text-muted">
              {game.name}
            </h3>
          </div>
          <p className="whitespace-nowrap text-xs tracking-[0.05px] text-text-muted">
            {game.meta}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Link href={game.href ?? "#"} className="flex w-full flex-col items-start">
      <div className="flex aspect-[2/3] w-full items-center justify-center overflow-clip rounded-2xl bg-bg-card transition-opacity hover:opacity-90">
        <div className="relative h-full w-full">
          <Image
            src={game.image}
            alt={game.name}
            fill
            sizes="(min-width: 1024px) 184px, 45vw"
            className="object-cover"
            priority={priority}
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
          <p className="whitespace-nowrap text-xs tracking-[0.05px] text-text-muted">
            {game.meta}
          </p>
        </div>
      </div>
    </Link>
  );
}
