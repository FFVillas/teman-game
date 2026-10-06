import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreateTeamForm from "@/components/lfg/CreateTeamForm";
import { createClient } from "@/lib/supabase/server";
import { fetchGameCatalog, fetchMyRankName } from "@/lib/games";

export const metadata: Metadata = {
  title: "Create a Team — TemanGame",
  description: "Recruit the perfect squad for your next Valorant match.",
};

export default async function CreateTeamPage() {
  const supabase = await createClient();
  const catalog = await fetchGameCatalog(supabase);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-12 sm:px-8">
          <CreateTeamForm
            gameSlug="valorant"
            gameName="Valorant"
            game={catalog.find((g) => g.slug === "valorant")}
            leaderRank={await fetchMyRankName(supabase, catalog, "valorant")}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
