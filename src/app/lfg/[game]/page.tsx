import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LfgHero from "@/components/lfg/LfgHero";
import LfgSearchBar from "@/components/lfg/LfgSearchBar";
import LfgToolbar from "@/components/lfg/LfgToolbar";
import LfgTeamGrid from "@/components/lfg/LfgTeamGrid";
import { gameBySlug } from "@/data/games";
import { navLinkFor } from "@/data/nav-links";
import { createClient } from "@/lib/supabase/server";
import { fetchGameCatalog, fetchMyRankName } from "@/lib/games";
import { fetchLobbyTeams } from "@/lib/lobbies";

interface LfgGamePageProps {
  params: Promise<{ game: string }>;
}

const description =
  "Browse available lobbies and teams looking for players. Filter by rank, mode, and region to find your perfect match.";

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
export default async function LfgGamePage({ params }: LfgGamePageProps) {
  const { game: slug } = await params;
  const meta = gameBySlug(slug);
  if (!meta) notFound();

  const supabase = await createClient();
  const catalog = await fetchGameCatalog(supabase);
  const game = catalog.find((g) => g.slug === slug);
  const myRank = await fetchMyRankName(supabase, catalog, slug);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const teams = game
    ? await fetchLobbyTeams(supabase, game, { viewerId: user?.id ?? null })
    : [];

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-12">
          <LfgHero
            gameIcon={navLinkFor(slug)?.icon ?? ""}
            gameName={meta.name}
            description={description}
          />

          <LfgSearchBar gameSlug={slug} game={game} myRank={myRank} />

          <LfgToolbar gameSlug={slug} resultCount={teams.length} />

          <LfgTeamGrid
            teams={teams}
            gameSlug={slug}
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
