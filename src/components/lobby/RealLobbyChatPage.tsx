import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import RealLobbyChatRoom from "@/components/lobby/RealLobbyChatRoom";
import { withNext } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";
import { fetchGameCatalog } from "@/lib/games";
import { fetchLobbyDetail, isLobbyId } from "@/lib/lobbies";

/**
 * `/lfg/<game>/lobby/<id>/chat` for a real lobby. Only the leader and members
 * of a lobby that is still open belong here; anyone else, and anyone once the
 * lobby has ended, is sent back to the lobby page.
 */
export default async function RealLobbyChatPage({
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
  if (!user) redirect(withNext("/login", `${lobbyHref}/chat`));

  const catalog = await fetchGameCatalog(supabase);
  const game = catalog.find((entry) => entry.slug === slug);
  if (!game) notFound();

  const data = await fetchLobbyDetail(supabase, game, id, user.id);
  if (!data) notFound();
  const { team, members } = data;

  const inLobby = team.viewerState === "leader" || team.viewerState === "member";
  if (!inLobby || team.closed) redirect(lobbyHref);

  return (
    <>
      <Navbar />
      {/* Full height under the 60px navbar and no footer: the chat is the
          whole page, with the message list scrolling inside it. */}
      <main className="flex h-[calc(100dvh-60px)] flex-col">
        <div className="mx-auto flex h-full w-full max-w-[1000px] flex-col px-4 py-4 sm:px-6 sm:py-6">
          <RealLobbyChatRoom
            lobbyId={team.id}
            game={team.game}
            name={team.name}
            status={team.started ? "Live" : team.status.isLive ? "Forming" : "Scheduled"}
            slotsTotal={team.slotsTotal}
            members={members.map((member) => ({
              id: member.id,
              name: member.username,
              avatar: member.avatar,
            }))}
            viewerId={user.id}
          />
        </div>
      </main>
    </>
  );
}
