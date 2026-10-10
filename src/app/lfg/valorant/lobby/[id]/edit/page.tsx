import type { Metadata } from "next";
import RealLobbyEditPage from "@/components/lobby/RealLobbyEditPage";

export const metadata: Metadata = {
  title: "Edit lobby — TemanGame",
};

/** Edit a real Valorant lobby (the mock lobbies have no edit screen). */
export default async function EditValorantLobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RealLobbyEditPage slug="valorant" id={id} />;
}
