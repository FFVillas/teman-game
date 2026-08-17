import { lfgTeams } from "./lfg-teams";

export interface RecentTeammate {
  id: string;
  name: string;
  avatar: string;
  teamName: string;
  playedAgo: string;
}

// How long ago you played with each team — keyed by lfg-teams.ts id.
// Only teams NOT led by the current user (Yonziii) make sense here.
const playedAgoByTeamId: Record<string, string> = {
  "team-4": "2 hours ago", // NYAWIT.COM — Threshcan
  "team-3": "1 day ago", // WOKDETOK — Ziza
  "team-2": "3 days ago", // KINOYYY — Tenz
};

export const recentTeammates: RecentTeammate[] = lfgTeams
  .filter((team) => playedAgoByTeamId[team.id])
  .map((team) => ({
    id: team.id,
    name: team.leaderName,
    avatar: team.members[0]?.avatar ?? "/lfg/avatars/avatar-1.jpg",
    teamName: team.name,
    playedAgo: playedAgoByTeamId[team.id],
  }));
