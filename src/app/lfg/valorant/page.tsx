import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LfgHero from "@/components/lfg/LfgHero";
import LfgToolbar from "@/components/lfg/LfgToolbar";
import LfgTeamGrid from "@/components/lfg/LfgTeamGrid";
import LfgPagination from "@/components/lfg/LfgPagination";
import { lfgTeams } from "@/data/lfg-teams";

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
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-12 sm:px-8">
          <LfgHero
            gameIcon="/icons/lfg-page-valorant.svg"
            gameName="Valorant"
            description="Browse available lobbies and professional teams looking for players. Filter by rank, role, and region to find your perfect match."
          />

          <LfgToolbar resultCount={128} />

          <LfgTeamGrid teams={lfgTeams} />

          <LfgPagination currentPage={1} totalPages={12} />
        </div>
      </main>
      <Footer />
    </>
  );
}
