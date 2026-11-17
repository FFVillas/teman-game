import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReportPlayerPanel from "@/components/profile/ReportPlayerPanel";
import { isLobbyId } from "@/lib/lobbies";
import { loadProfile } from "@/lib/profile-loader";

interface ReportPageProps {
  params: Promise<{ username: string }>;
  /** `?lobby=<id>` when the report comes from a match they played together. */
  searchParams: Promise<{ lobby?: string }>;
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadProfile(username);

  return {
    title: profile
      ? `Report ${profile.username} — TemanGame`
      : "Player Not Found — TemanGame",
  };
}

export default async function ReportPlayerPage({ params, searchParams }: ReportPageProps) {
  const { username } = await params;
  const { lobby } = await searchParams;
  const profile = await loadProfile(username);

  if (!profile) notFound();

  // You can't report yourself — the profile has no Report button for the
  // owner, so this only catches a hand-typed URL.
  if (profile.isOwner) redirect("/profile/me");

  const primaryStat = profile.gameStats[0];
  const lobbyId = lobby && isLobbyId(lobby) ? lobby : undefined;

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <ReportPlayerPanel
            target={{
              id: profile.userId ?? profile.slug,
              name: profile.username,
              avatar: profile.avatar,
              rank: primaryStat?.rank,
            }}
            game={primaryStat?.game ?? profile.gameSetups?.[0]?.gameName ?? ""}
            backHref={`/profile/${profile.slug}`}
            backLabel={`Back to ${profile.username}`}
            lobbyId={lobbyId}
            context={lobbyId ? "Attached to the lobby you played together." : undefined}
            live={Boolean(profile.userId)}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
