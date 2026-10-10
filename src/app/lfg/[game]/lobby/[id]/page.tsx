import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RealLobbyPage, {
  realLobbyMetadata,
} from "@/components/lobby/RealLobbyPage";
import { isLobbyId } from "@/lib/lobbies";

interface LobbyPageProps {
  params: Promise<{ game: string; id: string }>;
}

export async function generateMetadata({
  params,
}: LobbyPageProps): Promise<Metadata> {
  const { id } = await params;
  return isLobbyId(id)
    ? realLobbyMetadata(id)
    : { title: "Lobby not found — TemanGame" };
}

/**
 * A real lobby for every game except Valorant, whose own route
 * (`app/lfg/valorant/lobby/[id]`) handles real lobbies and the mock ones.
 */
export default async function GameLobbyPage({ params }: LobbyPageProps) {
  const { game, id } = await params;
  if (!isLobbyId(id)) notFound();
  return <RealLobbyPage slug={game} id={id} />;
}
