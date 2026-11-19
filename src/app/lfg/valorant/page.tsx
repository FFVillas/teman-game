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
import { fetchGameCatalog } from "@/lib/games";
import { fetchMyLobbies } from "@/lib/lobbies";
import { isFiltered, parseLobbyFilters } from "@/lib/lobby-filters";
import { recommendLobbies } from "@/lib/lobby-ranking";
import { fetchNews } from "@/lib/news";

export const metadata: Metadata = {
  title: "Find Your Next Valorant Team — TemanGame",
  description:
    "Browse open lobbies looking for players. Filter by rank, role, region and mode; the ones that fit how you play come first.",
};

// Valorant keeps its own route because it is the one game with the mock lobby
// and chat pages (real lobbies open here too; the list, the banner above it and
// the news are all real). The other five games share
// `app/lfg/[game]/page.tsx`; a static folder wins over the dynamic one.
export default async function LfgValorantPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseLobbyFilters(await searchParams);
  const supabase = await createClient();
  const [catalog, userId] = await Promise.all([fetchGameCatalog(supabase), getUserId()]);
  const game = catalog.find((g) => g.slug === "valorant");
  const [list, mine, news] = await Promise.all([
    game ? recommendLobbies(supabase, game, userId, filters) : null,
    userId ? fetchMyLobbies(supabase, userId) : null,
    fetchNews(supabase, game?.id),
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
            gameIcon="/icons/lfg-page-valorant.svg"
            gameName="Valorant"
            description="Browse open lobbies looking for players. Filter by rank, role, region and mode; the ones that fit how you play come first."
          />

          <ActiveLobbyBanner
            lobby={mine?.current ?? null}
            scheduled={mine?.scheduled}
          />

          <LfgSearchBar gameSlug="valorant" game={game} filters={filters} myRank={myRank} />

          <LfgToolbar gameSlug="valorant" resultCount={teams.length} filters={filters} />

          <LfgTeamGrid
            key={JSON.stringify(filters)}
            teams={teams}
            filtered={isFiltered(filters)}
            failed={!game || Boolean(list?.failed)}
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
