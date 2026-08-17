import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MatchHistoryList from "@/components/profile/MatchHistoryList";
import { playerProfiles } from "@/data/player-profiles";
import { matchesForSlug, pendingReviews } from "@/data/match-history";

interface MatchesPageProps {
  params: Promise<{ username: string }>;
}

export function generateStaticParams() {
  return Object.keys(playerProfiles).map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: MatchesPageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = playerProfiles[username];

  return {
    title: profile
      ? `${profile.username}'s Matches — TemanGame`
      : "Player Not Found — TemanGame",
  };
}

export default async function MatchesPage({ params }: MatchesPageProps) {
  const { username } = await params;
  const profile = playerProfiles[username];

  if (!profile) notFound();

  const matches = matchesForSlug(profile.slug);
  const isOwner = Boolean(profile.isOwner);
  const unrated = matches.reduce(
    (total, match) => total + pendingReviews(match).length,
    0
  );

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <Link
            href={isOwner ? "/profile/me" : `/profile/${profile.slug}`}
            className="flex w-fit items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src="/icons/lfg-back-arrow.svg" alt="" className="size-4" />
            Back to profile
          </Link>

          <div className="flex flex-col gap-4 rounded-2xl border border-border-strong bg-bg-card-alt p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-extrabold tracking-tight text-white">
                  Match history
                </h1>
                <p className="text-xs text-text-muted">
                  {matches.length} completed{" "}
                  {matches.length === 1 ? "lobby" : "lobbies"} ·{" "}
                  {profile.username}
                </p>
              </div>

              {isOwner && unrated > 0 && (
                <span className="rounded-md bg-star/15 px-2.5 py-1 text-[11px] font-bold text-star">
                  {unrated} rating{unrated === 1 ? "" : "s"} still open
                </span>
              )}
            </div>

            <MatchHistoryList
              matches={matches}
              slug={profile.slug}
              isOwner={isOwner}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
