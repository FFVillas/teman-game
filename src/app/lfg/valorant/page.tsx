import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LfgHero from "@/components/lfg/LfgHero";
import LfgToolbar from "@/components/lfg/LfgToolbar";
import LfgTeamGrid from "@/components/lfg/LfgTeamGrid";
import LfgPagination from "@/components/lfg/LfgPagination";
import LfgNews from "@/components/lfg/LfgNews";
import ActiveLobbyBanner from "@/components/lfg/ActiveLobbyBanner";
import { lfgTeams } from "@/data/lfg-teams";
import { activeLobby, scheduledLobbies } from "@/data/lfg-lobby";

export const metadata: Metadata = {
  title: "Find Your Next Valorant Team — TemanGame",
  description:
    "Browse available lobbies and professional teams looking for players. Filter by rank, role, and region to find your perfect match.",
};

export default function LfgValorantPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-12">
          <LfgHero
            gameIcon="/icons/lfg-page-valorant.svg"
            gameName="Valorant"
            description="Browse available lobbies and professional teams looking for players. Filter by rank, role, and region to find your perfect match."
          />

          <ActiveLobbyBanner
            lobby={activeLobby}
            scheduled={scheduledLobbies}
            isLeader
          />

          <LfgToolbar resultCount={128} />

          <LfgTeamGrid teams={lfgTeams} />

          <LfgPagination currentPage={1} totalPages={12} />

          <LfgNews />
        </div>
      </main>
      <Footer />
    </>
  );
}
