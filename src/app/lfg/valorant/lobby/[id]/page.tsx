import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RealLobbyPage, { realLobbyMetadata } from "@/components/lobby/RealLobbyPage";
import { isLobbyId } from "@/lib/lobbies";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return isLobbyId(id) ? realLobbyMetadata(id) : { title: "Lobby not found — TemanGame" };
}

/**
 * A Valorant lobby. The static `valorant` folder wins over `[game]`, so this
 * route has to exist; it renders the same real lobby page as every other game.
 * (The mock lobbies `lobby-1`… that used to live here are gone.)
 */
export default async function LobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isLobbyId(id)) notFound();
  return <RealLobbyPage slug="valorant" id={id} />;
}
