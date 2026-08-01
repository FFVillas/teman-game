import GameCard from "@/components/GameCard";
import { games } from "@/data/games";

export default function Hero() {
  return (
    <section className="flex flex-col items-center px-6 pt-16 pb-20">
      <div className="flex flex-col items-center text-center">
        <h1 className="max-w-[983px] text-2xl font-extrabold uppercase tracking-[-1.2px] text-white sm:text-3xl">
          Join over 10 million gamers looking to play everyday
        </h1>
        <p className="mt-4 max-w-[698px] text-base text-text-muted sm:text-lg">
          Connect with thousands of players worldwide. Filter by rank, role,
          and playstyle to dominate the leaderboard in your favorite
          competitive games.
        </p>
      </div>

      <div className="mt-16 grid w-full max-w-[993px] grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {games.map((game, index) => (
          <GameCard key={game.name} game={game} priority={index < 5} />
        ))}
      </div>
    </section>
  );
}
