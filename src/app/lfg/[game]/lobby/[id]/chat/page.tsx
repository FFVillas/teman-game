import type { Metadata } from "next";
import RealLobbyChatPage from "@/components/lobby/RealLobbyChatPage";

export const metadata: Metadata = {
  title: "Lobby chat — TemanGame",
};

/** A real lobby's chat, for every game except Valorant (its route is next to this one). */
export default async function GameLobbyChatPage({
  params,
}: {
  params: Promise<{ game: string; id: string }>;
}) {
  const { game, id } = await params;
  return <RealLobbyChatPage slug={game} id={id} />;
}
