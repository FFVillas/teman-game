import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlayerProfileView from "@/components/profile/PlayerProfileView";
import EnsureOwnerSession from "@/components/profile/EnsureOwnerSession";
import { playerProfiles } from "@/data/player-profiles";

const myProfile = playerProfiles.fayaz_ilovelittle;

export const metadata: Metadata = {
  title: `${myProfile.username} — TemanGame`,
  description: "Manage your player dossier, connections, and match history.",
};

export default function MyProfilePage() {
  return (
    <>
      <EnsureOwnerSession profile={myProfile} />
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-4 px-6 py-12 sm:px-8">
          <PlayerProfileView profile={myProfile} />
        </div>
      </main>
      <Footer />
    </>
  );
}
