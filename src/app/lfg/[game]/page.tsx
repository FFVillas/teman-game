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
import { fetchGameCatalog, fetchMyRankName } from "@/lib/games";
import { fetchLobbyTeams, fetchMyLobbies } from "@/lib/lobbies";

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
  const [catalog, userId] = await Promise.all([fetchGameCatalog(supabase), getUserId()]);
  const game = catalog.find((g) => g.slug === slug);
  const [teams, mine, myRank] = await Promise.all([
    game ? fetchLobbyTeams(supabase, game, { viewerId: userId }) : [],
    userId ? fetchMyLobbies(supabase, userId) : null,
    fetchMyRankName(supabase, catalog, slug, userId),
  ]);

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

          <LfgSearchBar gameSlug={slug} game={game} myRank={myRank} />

          <LfgToolbar gameSlug={slug} resultCount={teams.length} />

          <LfgTeamGrid
            teams={teams}
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
