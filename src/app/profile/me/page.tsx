import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlayerProfileView from "@/components/profile/PlayerProfileView";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileById, profileFromRow } from "@/lib/profiles";
import { fetchUserGames } from "@/lib/user-games";
import { withNext } from "@/lib/auth-redirect";

export const metadata: Metadata = {
  title: "My profile — TemanGame",
  description: "Manage your player dossier, connections, and match history.",
};

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(withNext("/login", "/profile/me"));

  // Staff accounts live in `admins`, not `profiles`, so there's no row.
  const row = await fetchProfileById(supabase, user.id);
  if (!row) notFound();

  const games = await fetchUserGames(supabase, user.id);
  const profile = profileFromRow(row, { isOwner: true, games });

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <PlayerProfileView profile={profile} />
        </div>
      </main>
      <Footer />
    </>
  );
}
