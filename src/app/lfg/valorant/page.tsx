import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LfgHero from "@/components/lfg/LfgHero";
import LfgSearchBar from "@/components/lfg/LfgSearchBar";
import LfgToolbar from "@/components/lfg/LfgToolbar";
import LfgTeamGrid from "@/components/lfg/LfgTeamGrid";
import LfgNews from "@/components/lfg/LfgNews";
import ActiveLobbyBanner from "@/components/lfg/ActiveLobbyBanner";
import {
  activeLobby,
  invitedLobbies,
  scheduledLobbies,
} from "@/data/lfg-lobby";
import { createClient } from "@/lib/supabase/server";
import { fetchGameCatalog, fetchMyRankName } from "@/lib/games";
import { fetchLobbyTeams } from "@/lib/lobbies";

export const metadata: Metadata = {
  title: "Find Your Next Valorant Team — TemanGame",
  description:
    "Browse available lobbies and professional teams looking for players. Filter by rank, role, and region to find your perfect match.",
};

// Valorant keeps its own route because it is the one game with lobby, news
// and chat pages built (those, and the banner above the list, are mock data;
// the list of lobbies itself is real). The other five games share
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
            lobby={activeLobby}
            scheduled={scheduledLobbies}
            invites={invitedLobbies}
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

          <LfgNews />
        </div>
      </main>
      <Footer />
    </>
  );
}
