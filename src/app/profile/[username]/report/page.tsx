import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReportPlayerPanel from "@/components/profile/ReportPlayerPanel";
import { playerProfiles } from "@/data/player-profiles";

interface ReportPageProps {
  params: Promise<{ username: string }>;
}

export function generateStaticParams() {
  return Object.keys(playerProfiles).map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = playerProfiles[username];

  return {
    title: profile
      ? `Report ${profile.username} — TemanGame`
      : "Player Not Found — TemanGame",
  };
}

export default async function ReportPlayerPage({ params }: ReportPageProps) {
  const { username } = await params;
  const profile = playerProfiles[username];

  if (!profile) notFound();

  const primaryStat = profile.gameStats[0];

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <ReportPlayerPanel
            target={{
              id: profile.slug,
              name: profile.username,
              avatar: profile.avatar,
              rank: primaryStat?.rank,
            }}
            game={primaryStat?.game ?? "Valorant"}
            backHref={`/profile/${profile.slug}`}
            backLabel={`Back to ${profile.username}`}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
