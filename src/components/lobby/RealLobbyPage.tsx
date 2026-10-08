import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RealLobbyDetail from "@/components/lobby/RealLobbyDetail";
import { createClient } from "@/lib/supabase/server";
import { fetchGameCatalog, fetchMyRankName } from "@/lib/games";
import { fetchLobbyDetail } from "@/lib/lobbies";

/**
 * A lobby from the database, for any game. Both lobby routes use this:
 * `lfg/valorant/lobby/[id]` (which also still serves the mock lobbies) and
 * `lfg/[game]/lobby/[id]`. Anyone can open a lobby; what they can do on the
 * page depends on who they are (leader, member, applicant, visitor).
 */
export async function realLobbyMetadata(id: string): Promise<Metadata> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lobbies")
    .select("name, description")
    .eq("id", id)
    .maybeSingle();
  return data
    ? { title: `${data.name} — TemanGame`, description: data.description ?? undefined }
    : { title: "Lobby not found — TemanGame" };
}

export default async function RealLobbyPage({
  slug,
  id,
}: {
  slug: string;
  id: string;
}) {
  const supabase = await createClient();
  const catalog = await fetchGameCatalog(supabase);
  const game = catalog.find((entry) => entry.slug === slug);
  if (!game) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const data = await fetchLobbyDetail(supabase, game, id, user?.id ?? null);
  if (!data) notFound();

  const myRank = await fetchMyRankName(supabase, catalog, slug);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <RealLobbyDetail
            data={data}
            game={game}
            viewerId={user?.id ?? null}
            myRank={myRank}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
