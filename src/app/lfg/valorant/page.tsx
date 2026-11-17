import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import LiveRefresh from "@/components/LiveRefresh";
import Footer from "@/components/Footer";
import LfgHero from "@/components/lfg/LfgHero";
import LfgSearchBar from "@/components/lfg/LfgSearchBar";
import LfgToolbar from "@/components/lfg/LfgToolbar";
import LfgTeamGrid from "@/components/lfg/LfgTeamGrid";
import LfgNews from "@/components/lfg/LfgNews";
import ActiveLobbyBanner from "@/components/lfg/ActiveLobbyBanner";
import { createClient, getUserId } from "@/lib/supabase/server";
import { fetchGameCatalog, fetchMyRankName } from "@/lib/games";
import { fetchLobbyTeams, fetchMyLobbies } from "@/lib/lobbies";
import { fetchNews } from "@/lib/news";

export const metadata: Metadata = {
  title: "Find Your Next Valorant Team — TemanGame",
  description:
    "Browse available lobbies and professional teams looking for players. Filter by rank, role, and region to find your perfect match.",
};

// Valorant keeps its own route because it is the one game with the mock lobby
// and chat pages (real lobbies open here too; the list, the banner above it and
// the news are all real). The other five games share
// `app/lfg/[game]/page.tsx`; a static folder wins over the dynamic one.
export default async function LfgValorantPage() {
  const supabase = await createClient();
  const [catalog, userId] = await Promise.all([fetchGameCatalog(supabase), getUserId()]);
  const game = catalog.find((g) => g.slug === "valorant");
  const [teams, mine, myRank, news] = await Promise.all([
    game ? fetchLobbyTeams(supabase, game, { viewerId: userId }) : [],
    userId ? fetchMyLobbies(supabase, userId) : null,
    fetchMyRankName(supabase, catalog, "valorant", userId),
    fetchNews(supabase, game?.id),
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
            gameIcon="/icons/lfg-page-valorant.svg"
            gameName="Valorant"
            description="Browse available lobbies and professional teams looking for players. Filter by rank, role, and region to find your perfect match."
          />

          <ActiveLobbyBanner
            lobby={mine?.current ?? null}
            scheduled={mine?.scheduled}
          />

          <LfgSearchBar gameSlug="valorant" game={game} myRank={myRank} />

          <LfgToolbar gameSlug="valorant" resultCount={teams.length} />

          <LfgTeamGrid
            teams={teams}
            gameName="Valorant"
            game={game}
            myRank={myRank}
          />

          <LfgNews articles={news} />
        </div>
      </main>
      <Footer />
    </>
  );
}
