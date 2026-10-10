import type { Metadata } from "next";
import RealLobbyEditPage from "@/components/lobby/RealLobbyEditPage";

export const metadata: Metadata = {
  title: "Edit lobby — TemanGame",
};

/** Edit a real lobby, for every game except Valorant (its route is next to this one). */
export default async function EditGameLobbyPage({
  params,
}: {
  params: Promise<{ game: string; id: string }>;
}) {
  const { game, id } = await params;
  return <RealLobbyEditPage slug={game} id={id} />;
}
