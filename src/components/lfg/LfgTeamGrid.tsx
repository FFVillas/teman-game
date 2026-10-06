"use client";

import { useState } from "react";
import Link from "next/link";
import type { LfgTeam } from "@/data/lfg-teams";
import LfgTeamCard from "./LfgTeamCard";
import RequestToJoinModal from "./RequestToJoinModal";
import LfgPagination from "./LfgPagination";
import type { GameInfo } from "@/lib/games";

const PAGE_SIZE = 6;

export default function LfgTeamGrid({
  teams,
  gameSlug,
  gameName,
  game,
  myRank,
}: {
  teams: LfgTeam[];
  gameSlug: string;
  gameName: string;
  /** The game's ranks, so the join dialog can check the viewer's rank fits. */
  game?: GameInfo;
  /** The signed-in viewer's rank in this game; "" if unknown. */
  myRank?: string;
}) {
  const [selectedTeam, setSelectedTeam] = useState<LfgTeam | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  if (teams.length === 0) {
    return (
      <div className="mt-2 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 py-14 text-center">
        <h3 className="text-base font-bold text-white">
          No {gameName} lobbies yet
        </h3>
        <p className="max-w-[420px] text-sm text-text-muted">
          Nobody is looking for players right now. Start a lobby and others
          can find you.
        </p>
        <Link
          href={`/lfg/${gameSlug}/create`}
          className="mt-1 flex h-10 items-center justify-center rounded-lg bg-brand px-5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Create a team
        </Link>
      </div>
    );
  }

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
            game={game}
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
          game={game}
          myRank={myRank}
        />
      )}
    </>
  );
}
