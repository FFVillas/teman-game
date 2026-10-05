import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EditProfileForm from "@/components/profile/EditProfileForm";
import { createClient } from "@/lib/supabase/server";
import {
  fetchOwnDateOfBirth,
  fetchProfileById,
  profileFromRow,
} from "@/lib/profiles";
import { fetchUserGames } from "@/lib/user-games";
import { withNext } from "@/lib/auth-redirect";

export const metadata: Metadata = {
  title: "Edit Profile — TemanGame",
  description:
    "Update your dossier, personality tags, availability and connected accounts.",
};

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(withNext("/login", "/profile/me/edit"));

  const row = await fetchProfileById(supabase, user.id);
  if (!row) notFound();

  const [dateOfBirth, games] = await Promise.all([
    fetchOwnDateOfBirth(supabase, user.id),
    fetchUserGames(supabase, user.id),
  ]);
  const profile = profileFromRow(row, { isOwner: true, games });

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <EditProfileForm
            profile={profile}
            row={row}
            userId={user.id}
            dateOfBirth={dateOfBirth}
            games={games}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
