import type { Metadata } from "next";
import LobbyRecord from "@/components/admin/LobbyRecord";

export const metadata: Metadata = { title: "Lobby — TemanGame Admin" };

export default async function AdminLobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LobbyRecord lobbyId={id} />;
}
