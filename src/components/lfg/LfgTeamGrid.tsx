"use client";

import { useState } from "react";
import type { LfgTeam } from "@/data/lfg-teams";
import LfgTeamCard from "./LfgTeamCard";
import RequestToJoinModal from "./RequestToJoinModal";

export default function LfgTeamGrid({ teams }: { teams: LfgTeam[] }) {
  const [selectedTeam, setSelectedTeam] = useState<LfgTeam | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-2">
        {teams.map((team) => (
          <LfgTeamCard
            key={team.id}
            team={team}
            onOpenDetails={() => setSelectedTeam(team)}
          />
        ))}
      </div>

      {selectedTeam && (
        <RequestToJoinModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </>
  );
}
