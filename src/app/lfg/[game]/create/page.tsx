import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreateTeamForm from "@/components/lfg/CreateTeamForm";
import { gameBySlug } from "@/data/games";
import { createClient } from "@/lib/supabase/server";
import { fetchGameCatalog, fetchMyRankName } from "@/lib/games";

interface CreateTeamPageProps {
  params: Promise<{ game: string }>;
}

export async function generateMetadata({
  params,
}: CreateTeamPageProps): Promise<Metadata> {
  const { game: slug } = await params;
  const game = gameBySlug(slug);

  return game
    ? {
        title: "Create a Team — TemanGame",
        description: `Recruit the perfect squad for your next ${game.name} match.`,
      }
    : { title: "Game Not Found — TemanGame" };
}

/** Create-a-team for every game except Valorant (see `app/lfg/valorant/create`). */
export default async function CreateTeamPage({ params }: CreateTeamPageProps) {
  const { game: slug } = await params;
  const meta = gameBySlug(slug);
  if (!meta) notFound();

  const supabase = await createClient();
  const catalog = await fetchGameCatalog(supabase);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-12 sm:px-8">
          <CreateTeamForm
            gameSlug={slug}
            gameName={meta.name}
            game={catalog.find((g) => g.slug === slug)}
            leaderRank={await fetchMyRankName(supabase, catalog, slug)}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
