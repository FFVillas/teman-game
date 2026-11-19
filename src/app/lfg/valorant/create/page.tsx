import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreateTeamForm from "@/components/lfg/CreateTeamForm";
import { createClient, getUserId } from "@/lib/supabase/server";
import { fetchGameCatalog, fetchMyPlaystyle, fetchMyRankName } from "@/lib/games";
import { withNext } from "@/lib/auth-redirect";

export const metadata: Metadata = {
  title: "Create a Lobby — TemanGame",
  description: "Set up a lobby for your next Valorant match and choose who joins.",
};

export default async function CreateTeamPage() {
  const supabase = await createClient();
  const [catalog, userId] = await Promise.all([fetchGameCatalog(supabase), getUserId()]);
  // Only players can make a lobby (create_lobby refuses anyone else), so a
  // visitor goes to log in first and comes straight back here, instead of
  // filling in the whole form to be told at the end.
  if (!userId) redirect(withNext("/login", "/lfg/valorant/create"));
  const [leaderRank, leaderPlaystyle] = await Promise.all([
    fetchMyRankName(supabase, catalog, "valorant", userId),
    fetchMyPlaystyle(supabase, userId),
  ]);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-12 sm:px-8">
          <CreateTeamForm
            gameSlug="valorant"
            gameName="Valorant"
            game={catalog.find((g) => g.slug === "valorant")}
            leaderRank={leaderRank}
            leaderPlaystyle={leaderPlaystyle}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
