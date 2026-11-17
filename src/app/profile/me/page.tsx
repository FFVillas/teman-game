import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlayerProfileView from "@/components/profile/PlayerProfileView";
import { createClient, getUserId } from "@/lib/supabase/server";
import { fetchProfileById, fetchSanctionHistory, profileFromRow } from "@/lib/profiles";
import { withNext } from "@/lib/auth-redirect";
import { fetchGameCatalog, fetchPlayerGames } from "@/lib/games";
import { fetchPlayerMatches } from "@/lib/matches";

export const metadata: Metadata = {
  title: "My profile — TemanGame",
  description: "Manage your player dossier, connections, and match history.",
};

export default async function MyProfilePage() {
  const [supabase, userId] = await Promise.all([createClient(), getUserId()]);
  if (!userId) redirect(withNext("/login", "/profile/me"));

  const catalog = await fetchGameCatalog(supabase);
  const [row, gameSetups, matches, sanctions] = await Promise.all([
    fetchProfileById(supabase, userId),
    fetchPlayerGames(supabase, userId),
    fetchPlayerMatches(supabase, catalog, userId, userId),
    fetchSanctionHistory(supabase, userId),
  ]);
  // Staff accounts live in `admins`, not `profiles`, so there's no row.
  if (!row) notFound();

  const profile = profileFromRow(row, { isOwner: true, gameSetups, sanctions });

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <PlayerProfileView profile={profile} matches={matches} />
        </div>
      </main>
      <Footer />
    </>
  );
}
