import type { Metadata } from "next";
import PlayerRecord from "@/components/admin/PlayerRecord";

export const metadata: Metadata = { title: "Player — TemanGame Admin" };

export default async function AdminPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlayerRecord playerId={id} />;
}
