"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LfgTeam } from "@/data/lfg-teams";
import LfgTeamCard from "./LfgTeamCard";
import RequestToJoinModal from "./RequestToJoinModal";
import LfgPagination from "./LfgPagination";
import Mascot from "@/components/Mascot";
import type { GameInfo } from "@/lib/games";

const PAGE_SIZE = 6;

export default function LfgTeamGrid({
  teams,
  gameName,
  game,
  myRank,
  filtered = false,
  failed = false,
}: {
  teams: LfgTeam[];
  gameName: string;
  /** The list is narrowed by search or filters, so empty means "no match". */
  filtered?: boolean;
  /** The lobbies couldn't be read; say so rather than "nobody is playing". */
  failed?: boolean;
  /** The game's ranks, so the join dialog can check the viewer's rank fits. */
  game?: GameInfo;
  /** The signed-in viewer's rank in this game; "" if unknown. */
  myRank?: string;
}) {
  const router = useRouter();
  const [selectedTeam, setSelectedTeam] = useState<LfgTeam | null>(null);

  // A lobby you lead, are in, or have applied to opens its own page: there is
  // nothing to apply for. Everyone else gets the apply dialog.
  function openTeam(team: LfgTeam) {
    const hasPlace =
      team.viewerState === "leader" ||
      team.viewerState === "member" ||
      team.viewerState === "pending";
    if (hasPlace) router.push(`/lfg/${team.game}/lobby/${team.id}`);
    else setSelectedTeam(team);
  }
  const [currentPage, setCurrentPage] = useState(1);

  if (failed) {
    return (
      <div
        role="alert"
        className="mt-2 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-danger/30 px-6 py-10 text-center"
      >
        <h3 className="text-sm font-semibold text-danger">Couldn&apos;t load lobbies</h3>
        <p className="max-w-[420px] text-xs text-text-muted">
          Something went wrong on our side. Check your connection, then try again.
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-1 flex h-9 items-center justify-center rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-subtle transition-colors hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="mt-2 flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
        {/* Two different situations, so two different poses: squinting at the
            filters, or asleep because nobody is around. Five of the six games
            have no lobbies at all yet, so the second one is what most
            visitors actually meet. */}
        <Mascot
          pose={filtered ? "filter" : "soon"}
          size={88}
          className="mb-1 opacity-80"
        />
        <h3 className="text-sm font-semibold text-text-muted">
          {filtered ? "No lobbies match" : `No ${gameName} lobbies yet`}
        </h3>
        <p className="max-w-[420px] text-xs text-text-muted/60">
          {filtered
            ? "Try another rank, role or region, or clear the search."
            : "Nobody is looking for players right now. Start one with Create Lobby above and others can find you."}
        </p>
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
            onOpenDetails={() => openTeam(team)}
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
