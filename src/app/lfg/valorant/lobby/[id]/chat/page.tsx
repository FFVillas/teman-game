import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import LobbyChatRoom from "@/components/lobby/LobbyChatRoom";
import {
  CURRENT_PLAYER_ID,
  allLobbies,
  lobbyById,
  viewerRoleIn,
} from "@/data/lfg-lobby";

// Every lobby gets a chat page automatically — no separate "create chat" step.
export function generateStaticParams() {
  return allLobbies.map((lobby) => ({ id: lobby.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lobby = lobbyById(id);
  return {
    title: lobby ? `${lobby.name} chat — TemanGame` : "Chat not found — TemanGame",
  };
}

export default async function LobbyChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lobby = lobbyById(id);
  // Same rule as the lobby page: only the leader, members and invitees get
  // in. TODO: use the real session's user id.
  const role = lobby ? viewerRoleIn(lobby, CURRENT_PLAYER_ID) : null;

  if (!lobby || !role) notFound();

  return (
    <>
      <Navbar />
      {/* Full height under the 60px navbar and no footer: the chat is the
          whole page, with the message list scrolling inside it. */}
      <main className="flex h-[calc(100dvh-60px)] flex-col">
        <div className="mx-auto flex h-full w-full max-w-[1000px] flex-col px-4 py-4 sm:px-6 sm:py-6">
          <LobbyChatRoom lobby={lobby} initialRole={role} />
        </div>
      </main>
    </>
  );
}
