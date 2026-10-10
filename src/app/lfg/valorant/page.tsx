import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LfgHero from "@/components/lfg/LfgHero";
import LfgSearchBar from "@/components/lfg/LfgSearchBar";
import LfgToolbar from "@/components/lfg/LfgToolbar";
import LfgTeamGrid from "@/components/lfg/LfgTeamGrid";
import LfgNews from "@/components/lfg/LfgNews";
import ActiveLobbyBanner from "@/components/lfg/ActiveLobbyBanner";
import { createClient } from "@/lib/supabase/server";
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
  const catalog = await fetchGameCatalog(supabase);
  const game = catalog.find((g) => g.slug === "valorant");
  const myRank = await fetchMyRankName(supabase, catalog, "valorant");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const teams = game
    ? await fetchLobbyTeams(supabase, game, { viewerId: user?.id ?? null })
    : [];
  const news = await fetchNews(supabase, game?.id);
  const mine = user ? await fetchMyLobbies(supabase, user.id) : null;

  return (
    <>
      <Navbar />
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
            gameSlug="valorant"
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
