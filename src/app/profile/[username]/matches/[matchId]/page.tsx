import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MatchDetailView from "@/components/profile/MatchDetailView";
import { loadMatches, loadProfile } from "@/lib/profile-loader";

interface MatchDetailPageProps {
  params: Promise<{ username: string; matchId: string }>;
}

async function loadMatch(username: string, matchId: string) {
  const profile = await loadProfile(username);
  if (!profile) return null;
  const match = (await loadMatches(profile)).find((entry) => entry.id === matchId);
  return match ? { profile, match } : null;
}

export async function generateMetadata({
  params,
}: MatchDetailPageProps): Promise<Metadata> {
  const { username, matchId } = await params;
  const found = await loadMatch(username, matchId);

  return {
    title: found ? `${found.match.lobbyName} — TemanGame` : "Match Not Found — TemanGame",
    description: found
      ? `Completed ${found.match.lobbyType.toLowerCase()} on ${found.match.endedOn}.`
      : undefined,
  };
}

export default async function MatchDetailPage({
  params,
}: MatchDetailPageProps) {
  const { username, matchId } = await params;
  const found = await loadMatch(username, matchId);
  if (!found) notFound();
  const { profile, match } = found;

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <MatchDetailView
            match={match}
            slug={profile.slug}
            username={profile.username}
            ownerAvatar={profile.avatar}
            isOwner={Boolean(profile.isOwner)}
            live={Boolean(profile.userId)}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
