import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreateTeamForm from "@/components/lfg/CreateTeamForm";
import { withNext } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";
import { fetchGameCatalog, fetchMyRankName } from "@/lib/games";
import { fetchLobbyDetail, isLobbyId } from "@/lib/lobbies";

/**
 * Edit a lobby you lead. It is the create form with the lobby's values in it
 * (`CreateTeamForm` with `edit`), so a leader sees the same screen both times.
 * Anyone who isn't the leader, or a lobby that is over, goes back to the lobby.
 */
export default async function RealLobbyEditPage({
  slug,
  id,
}: {
  slug: string;
  id: string;
}) {
  if (!isLobbyId(id)) notFound();

  const supabase = await createClient();
  const lobbyHref = `/lfg/${slug}/lobby/${id}`;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(withNext("/login", `${lobbyHref}/edit`));

  const catalog = await fetchGameCatalog(supabase);
  const game = catalog.find((entry) => entry.slug === slug);
  if (!game) notFound();

  const data = await fetchLobbyDetail(supabase, game, id, user.id);
  if (!data) notFound();
  const { team, voiceUrl } = data;
  if (team.viewerState !== "leader" || team.closed || team.modeId === undefined) {
    redirect(lobbyHref);
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-12 sm:px-8">
          <CreateTeamForm
            gameSlug={slug}
            gameName={game.name}
            game={game}
            leaderRank={await fetchMyRankName(supabase, catalog, slug)}
            edit={{
              lobbyId: team.id,
              status: team.started ? "started" : team.status.isLive ? "live" : "scheduled",
              name: team.name,
              description: team.bio ?? "",
              modeId: team.modeId,
              region: team.region,
              languages: team.languages ? team.languages.split(" / ") : [],
              mic: Boolean(team.micRequired),
              tags: team.tags ?? [],
              capacity: team.slotsTotal,
              rankRange: team.rankRange,
              roleNames: team.lookingFor.map((role) => role.name),
              discordUrl: voiceUrl ?? "",
              startsAt: team.startsAt ?? null,
              endsAt: team.endsAt ?? null,
            }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
