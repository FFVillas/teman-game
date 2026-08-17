import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlayerProfileView from "@/components/profile/PlayerProfileView";
import { playerProfiles } from "@/data/player-profiles";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = playerProfiles[username];

  return {
    title: profile
      ? `${profile.username} — TemanGame`
      : "Player Not Found — TemanGame",
    description: profile
      ? `View ${profile.username}'s player dossier, connections, and match history on TemanGame.`
      : undefined,
  };
}

export default async function PlayerProfilePage({
  params,
}: ProfilePageProps) {
  const { username } = await params;
  const profile = playerProfiles[username];

  if (!profile) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-4 px-6 py-12 sm:px-8">
          <PlayerProfileView profile={profile} />
        </div>
      </main>
      <Footer />
    </>
  );
}
