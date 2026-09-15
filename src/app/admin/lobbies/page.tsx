import type { Metadata } from "next";
import LobbyDirectory from "@/components/admin/LobbyDirectory";

export const metadata: Metadata = { title: "Lobbies — TemanGame Admin" };

export default function AdminLobbiesPage() {
  return <LobbyDirectory />;
}
