import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LobbyDetail from "@/components/lobby/LobbyDetail";
import RealLobbyPage, {
  realLobbyMetadata,
} from "@/components/lobby/RealLobbyPage";
import { isLobbyId } from "@/lib/lobbies";
import {
  CURRENT_PLAYER_ID,
  allLobbies,
  lobbyById,
  viewerRoleIn,
} from "@/data/lfg-lobby";

export function generateStaticParams() {
  return allLobbies.map((lobby) => ({ id: lobby.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (isLobbyId(id)) return realLobbyMetadata(id);
  const lobby = lobbyById(id);

  if (!lobby) return { title: "Lobby not found — TemanGame" };

  return {
    title: `${lobby.name} — TemanGame`,
    description: lobby.bio,
  };
}

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // A uuid is a real lobby from the database; "lobby-1" and friends are the
  // mock ones the demo screens use.
  if (isLobbyId(id)) return <RealLobbyPage slug="valorant" id={id} />;

  const lobby = lobbyById(id);
  // Your role comes from the lobby data itself, like it will from the
  // database: leader, member, or holding an invite. Anyone else has no
  // business on this page. TODO: use the real session's user id.
  const role = lobby ? viewerRoleIn(lobby, CURRENT_PLAYER_ID) : null;

  if (!lobby || !role) notFound();

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <LobbyDetail lobby={lobby} initialRole={role} />
        </div>
      </main>
      <Footer />
    </>
  );
}
