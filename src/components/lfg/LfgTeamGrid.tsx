"use client";

import { useState } from "react";
import type { LfgTeam } from "@/data/lfg-teams";
import LfgTeamCard from "./LfgTeamCard";
import RequestToJoinModal from "./RequestToJoinModal";
import LfgPagination from "./LfgPagination";

const PAGE_SIZE = 6;

export default function LfgTeamGrid({ teams }: { teams: LfgTeam[] }) {
  const [selectedTeam, setSelectedTeam] = useState<LfgTeam | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(teams.length / PAGE_SIZE));
  const pageTeams = teams.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function handlePageChange(page: number) {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-2">
        {pageTeams.map((team) => (
          <LfgTeamCard
            key={team.id}
            team={team}
            onOpenDetails={() => setSelectedTeam(team)}
          />
        ))}
      </div>

      <LfgPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {selectedTeam && (
        <RequestToJoinModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </>
  );
}
