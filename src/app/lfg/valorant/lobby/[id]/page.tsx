import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LobbyDetail from "@/components/lobby/LobbyDetail";
import { activeLobby, scheduledLobbies, lobbyById } from "@/data/lfg-lobby";

export function generateStaticParams() {
  return [activeLobby, ...scheduledLobbies].map((lobby) => ({ id: lobby.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
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
  const lobby = lobbyById(id);

  if (!lobby) notFound();

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <LobbyDetail lobby={lobby} />
        </div>
      </main>
      <Footer />
    </>
  );
}
