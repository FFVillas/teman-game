import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MatchDetailView from "@/components/profile/MatchDetailView";
import { playerProfiles } from "@/data/player-profiles";
import { matchById, matchHistory } from "@/data/match-history";

interface MatchDetailPageProps {
  params: Promise<{ username: string; matchId: string }>;
}

export function generateStaticParams() {
  return Object.entries(matchHistory).flatMap(([username, matches]) =>
    matches.map((match) => ({ username, matchId: match.id }))
  );
}

export async function generateMetadata({
  params,
}: MatchDetailPageProps): Promise<Metadata> {
  const { username, matchId } = await params;
  const match = matchById(username, matchId);

  return {
    title: match ? `${match.lobbyName} — TemanGame` : "Match Not Found — TemanGame",
    description: match
      ? `Completed ${match.lobbyType.toLowerCase()} on ${match.endedOn}.`
      : undefined,
  };
}

export default async function MatchDetailPage({
  params,
}: MatchDetailPageProps) {
  const { username, matchId } = await params;
  const profile = playerProfiles[username];
  const match = matchById(username, matchId);

  if (!profile || !match) notFound();

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <MatchDetailView
            match={match}
            slug={profile.slug}
            username={profile.username}
            isOwner={Boolean(profile.isOwner)}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
