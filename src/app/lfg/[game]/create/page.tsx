import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreateTeamForm from "@/components/lfg/CreateTeamForm";
import { gameBySlug } from "@/data/games";
import { createClient, getUserId } from "@/lib/supabase/server";
import { fetchGameCatalog, fetchMyPlaystyle, fetchMyRankName } from "@/lib/games";
import { withNext } from "@/lib/auth-redirect";

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
        title: "Create a Lobby — TemanGame",
        description: `Set up a lobby for your next ${game.name} match and choose who joins.`,
      }
    : { title: "Game Not Found — TemanGame" };
}

/** Create-a-team for every game except Valorant (see `app/lfg/valorant/create`). */
export default async function CreateTeamPage({ params }: CreateTeamPageProps) {
  const { game: slug } = await params;
  const meta = gameBySlug(slug);
  if (!meta) notFound();

  const supabase = await createClient();
  const [catalog, userId] = await Promise.all([fetchGameCatalog(supabase), getUserId()]);
  // Only players can make a lobby (create_lobby refuses anyone else), so a
  // visitor goes to log in first and comes straight back here, instead of
  // filling in the whole form to be told at the end.
  if (!userId) redirect(withNext("/login", `/lfg/${slug}/create`));
  const [leaderRank, leaderPlaystyle] = await Promise.all([
    fetchMyRankName(supabase, catalog, slug, userId),
    fetchMyPlaystyle(supabase, userId),
  ]);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-12 sm:px-8">
          <CreateTeamForm
            gameSlug={slug}
            gameName={meta.name}
            game={catalog.find((g) => g.slug === slug)}
            leaderRank={leaderRank}
            leaderPlaystyle={leaderPlaystyle}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
