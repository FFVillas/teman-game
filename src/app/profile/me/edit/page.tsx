import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EditProfileForm from "@/components/profile/EditProfileForm";
import EnsureOwnerSession from "@/components/profile/EnsureOwnerSession";
import { playerProfiles } from "@/data/player-profiles";

const myProfile = playerProfiles.fayaz_ilovelittle;

export const metadata: Metadata = {
  title: "Edit Profile — TemanGame",
  description:
    "Update your dossier, personality tags, availability and connected accounts.",
};

export default function EditProfilePage() {
  return (
    <>
      <EnsureOwnerSession profile={myProfile} />
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <EditProfileForm profile={myProfile} />
        </div>
      </main>
      <Footer />
    </>
  );
}
