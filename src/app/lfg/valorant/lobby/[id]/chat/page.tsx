import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RealLobbyChatPage from "@/components/lobby/RealLobbyChatPage";
import { isLobbyId } from "@/lib/lobbies";

export const metadata: Metadata = {
  title: "Lobby chat — TemanGame",
};

/** A Valorant lobby's chat; same page as every other game's. */
export default async function LobbyChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isLobbyId(id)) notFound();
  return <RealLobbyChatPage slug="valorant" id={id} />;
}
