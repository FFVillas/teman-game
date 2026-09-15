import type { Metadata } from "next";
import PlayerDirectory from "@/components/admin/PlayerDirectory";

export const metadata: Metadata = { title: "Players — TemanGame Admin" };

export default function AdminPlayersPage() {
  return <PlayerDirectory />;
}
