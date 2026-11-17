import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import LiveRefresh from "@/components/LiveRefresh";
import Footer from "@/components/Footer";
import LfgHero from "@/components/lfg/LfgHero";
import LfgSearchBar from "@/components/lfg/LfgSearchBar";
import LfgToolbar from "@/components/lfg/LfgToolbar";
import LfgTeamGrid from "@/components/lfg/LfgTeamGrid";
import ActiveLobbyBanner from "@/components/lfg/ActiveLobbyBanner";
import { gameBySlug } from "@/data/games";
import { navLinkFor } from "@/data/nav-links";
import { createClient, getUserId } from "@/lib/supabase/server";
import { fetchGameCatalog } from "@/lib/games";
import { fetchMyLobbies } from "@/lib/lobbies";
import { isFiltered, parseLobbyFilters } from "@/lib/lobby-filters";
import { recommendLobbies } from "@/lib/lobby-ranking";

interface LfgGamePageProps {
  params: Promise<{ game: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const description =
  "Browse open lobbies looking for players. Filter by rank, role, region and mode; the ones that fit how you play come first.";

export async function generateMetadata({
  params,
}: LfgGamePageProps): Promise<Metadata> {
  const { game: slug } = await params;
  const game = gameBySlug(slug);

  return game
    ? { title: `Find Your Next ${game.name} Team — TemanGame`, description }
    : { title: "Game Not Found — TemanGame" };
}

/**
 * The LFG page for every game except Valorant (which has its own route, see
 * `app/lfg/valorant`). The list is the game's real lobbies, and the filters
 * are the game's own: its regions, its modes and its rank ladder.
 */
export default async function LfgGamePage({ params, searchParams }: LfgGamePageProps) {
  const { game: slug } = await params;
  const filters = parseLobbyFilters(await searchParams);
  const meta = gameBySlug(slug);
  if (!meta) notFound();

  const supabase = await createClient();
  const [catalog, userId] = await Promise.all([fetchGameCatalog(supabase), getUserId()]);
  const game = catalog.find((g) => g.slug === slug);
  const [list, mine] = await Promise.all([
    game ? recommendLobbies(supabase, game, userId, filters) : null,
    userId ? fetchMyLobbies(supabase, userId) : null,
  ]);
  const teams = list?.lobbies ?? [];
  const myRank = list?.viewer?.rankName ?? "";

  return (
    <>
      <Navbar />
      {/* The list, its slot counts and "Your lobby" change as people post,
          join and leave, so the page re-reads itself when they do. */}
      {game && (
        <LiveRefresh
          enabled={Boolean(userId)}
          subscriptions={[
            { table: "lobby", filter: `game_id=eq.${game.id}` },
            { table: "applications", filter: `game_id=eq.${game.id}` },
          ]}
        />
      )}
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-12">
          <LfgHero
            gameIcon={navLinkFor(slug)?.icon ?? ""}
            gameName={meta.name}
            description={description}
          />

          <ActiveLobbyBanner
            lobby={mine?.current ?? null}
            scheduled={mine?.scheduled}
          />

          <LfgSearchBar gameSlug={slug} game={game} filters={filters} myRank={myRank} />

          <LfgToolbar gameSlug={slug} resultCount={teams.length} filters={filters} />

          <LfgTeamGrid
            key={JSON.stringify(filters)}
            teams={teams}
            filtered={isFiltered(filters)}
            gameName={meta.name}
            game={game}
            myRank={myRank}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
