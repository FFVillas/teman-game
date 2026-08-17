import { lfgRanks, type LfgRank } from "./lfg-ranks";
import { lfgRoles, type LfgRole } from "./lfg-roles";
import type { LfgMode } from "./lfg-teams";

/**
 * Completed lobbies, per player. This is what the profile's history section
 * and the match detail screen read from.
 *
 * `reviewed` is the important flag: rating is optional at the end of a lobby
 * (you can Skip), so a teammate you skipped stays reviewable afterwards. The
 * match detail page is where that gets picked back up.
 */

export interface MatchTeammate {
  id: string;
  name: string;
  /** Set when we have a profile on file, so the row can link through. */
  slug?: string;
  avatar: string;
  rank: LfgRank;
  role: LfgRole;
  wasLeader: boolean;
  /** Has the viewer already left a review for this teammate? */
  reviewed: boolean;
}

export interface MatchRecord {
  id: string;
  lobbyName: string;
  lobbyType: string;
  game: string;
  cover: string;
  mode: LfgMode;
  region: string;
  /** Absolute timestamp — the detail page shows this. */
  endedOn: string;
  /** Relative, for compact list rows. */
  endedAgo: string;
  duration: string;
  viewerWasLeader: boolean;
  teammates: MatchTeammate[];
}

function teammate(
  id: string,
  name: string,
  avatar: string,
  rank: LfgRank,
  role: LfgRole,
  options: { slug?: string; wasLeader?: boolean; reviewed?: boolean } = {}
): MatchTeammate {
  return {
    id,
    name,
    avatar,
    rank,
    role,
    slug: options.slug,
    wasLeader: options.wasLeader ?? false,
    reviewed: options.reviewed ?? true,
  };
}

const kinoyyy = () =>
  teammate("u-2", "Kinoyyy", "/lfg/avatars/avatar-2.jpg", lfgRanks.ascendant, lfgRoles.sentinel);
const ziza = () =>
  teammate("u-3", "Ziza", "/lfg/avatars/avatar-7.jpg", lfgRanks.silver, lfgRoles.controller, {
    slug: "ziza",
  });
const threshcan = () =>
  teammate("u-4", "Threshcan", "/lfg/avatars/avatar-3.jpg", lfgRanks.ascendant, lfgRoles.initiator, {
    slug: "threshcan",
  });
const tenz = () =>
  teammate("u-5", "Tenz", "/lfg/avatars/avatar-4.jpg", lfgRanks.radiant, lfgRoles.duelist, {
    slug: "tenz",
  });
const yonziii = () =>
  teammate("u-1", "Yonziii", "/lfg/avatars/avatar-1.jpg", lfgRanks.immortal, lfgRoles.duelist, {
    slug: "yonziii",
  });
const nyawit = () =>
  teammate("u-6", "Nyawit", "/lfg/avatars/avatar-5.jpg", lfgRanks.ascendant, lfgRoles.initiator);

export const matchHistory: Record<string, MatchRecord[]> = {
  fayaz_ilovelittle: [
    {
      id: "match-1",
      lobbyName: "MAKAN BERGIZI GRATIS",
      lobbyType: "Competitive Lobby",
      game: "valorant",
      cover: "/lfg/covers/valorant-cover-1.jpg",
      mode: "ranked",
      region: "SG2",
      endedOn: "17 Aug 2026, 22:41",
      endedAgo: "2 hours ago",
      duration: "1h 12m",
      viewerWasLeader: true,
      teammates: [
        { ...kinoyyy(), reviewed: true },
        { ...ziza(), reviewed: false },
        { ...threshcan(), reviewed: false },
      ],
    },
    {
      id: "match-2",
      lobbyName: "Shadow Stalkers",
      lobbyType: "Competitive Lobby",
      game: "valorant",
      cover: "/lfg/covers/valorant-cover-1.jpg",
      mode: "ranked",
      region: "SG2",
      endedOn: "16 Aug 2026, 21:05",
      endedAgo: "1 day ago",
      duration: "48m",
      viewerWasLeader: false,
      teammates: [
        { ...yonziii(), reviewed: true },
        { ...nyawit(), reviewed: true },
      ],
    },
    {
      id: "match-3",
      lobbyName: "KINOYYY",
      lobbyType: "Casual Lobby",
      game: "valorant",
      cover: "/lfg/covers/valorant-cover-4.jpg",
      mode: "casual",
      region: "SG2",
      endedOn: "14 Aug 2026, 20:12",
      endedAgo: "3 days ago",
      duration: "2h 04m",
      viewerWasLeader: false,
      teammates: [
        { ...tenz(), reviewed: true },
        { ...ziza(), reviewed: true },
      ],
    },
    {
      id: "match-4",
      lobbyName: "NYAWIT.COM",
      lobbyType: "Tournament Lobby",
      game: "valorant",
      cover: "/lfg/covers/valorant-cover-3.jpg",
      mode: "tournament",
      region: "SG2",
      endedOn: "10 Aug 2026, 19:30",
      endedAgo: "1 week ago",
      duration: "3h 21m",
      viewerWasLeader: false,
      teammates: [
        { ...threshcan(), wasLeader: true, reviewed: true },
        { ...kinoyyy(), reviewed: true },
        { ...tenz(), reviewed: true },
      ],
    },
  ],
  yonziii: [
    {
      id: "match-1",
      lobbyName: "MAKAN BERGIZI GRATIS",
      lobbyType: "Competitive Lobby",
      game: "valorant",
      cover: "/lfg/covers/valorant-cover-1.jpg",
      mode: "ranked",
      region: "SG2",
      endedOn: "17 Aug 2026, 22:41",
      endedAgo: "2 hours ago",
      duration: "1h 12m",
      viewerWasLeader: true,
      teammates: [{ ...kinoyyy() }, { ...ziza() }],
    },
    {
      id: "match-2",
      lobbyName: "Shadow Stalkers",
      lobbyType: "Competitive Lobby",
      game: "valorant",
      cover: "/lfg/covers/valorant-cover-1.jpg",
      mode: "ranked",
      region: "SG2",
      endedOn: "16 Aug 2026, 21:05",
      endedAgo: "1 day ago",
      duration: "48m",
      viewerWasLeader: true,
      teammates: [{ ...nyawit() }, { ...threshcan() }],
    },
  ],
  tenz: [
    {
      id: "match-1",
      lobbyName: "KINOYYY",
      lobbyType: "Casual Lobby",
      game: "valorant",
      cover: "/lfg/covers/valorant-cover-4.jpg",
      mode: "casual",
      region: "SG2",
      endedOn: "17 Aug 2026, 19:40",
      endedAgo: "5 hours ago",
      duration: "2h 04m",
      viewerWasLeader: true,
      teammates: [{ ...ziza() }, { ...nyawit() }],
    },
  ],
  ziza: [
    {
      id: "match-1",
      lobbyName: "WOKDETOK",
      lobbyType: "Competitive Lobby",
      game: "valorant",
      cover: "/lfg/covers/valorant-cover-2.jpg",
      mode: "ranked",
      region: "SG2",
      endedOn: "17 Aug 2026, 21:18",
      endedAgo: "3 hours ago",
      duration: "1h 33m",
      viewerWasLeader: true,
      teammates: [{ ...yonziii() }, { ...kinoyyy() }],
    },
  ],
  threshcan: [
    {
      id: "match-1",
      lobbyName: "NYAWIT.COM",
      lobbyType: "Tournament Lobby",
      game: "valorant",
      cover: "/lfg/covers/valorant-cover-3.jpg",
      mode: "tournament",
      region: "SG2",
      endedOn: "17 Aug 2026, 23:10",
      endedAgo: "1 hour ago",
      duration: "3h 21m",
      viewerWasLeader: true,
      teammates: [{ ...tenz() }, { ...kinoyyy() }],
    },
  ],
};

export function matchesForSlug(slug: string): MatchRecord[] {
  return matchHistory[slug] ?? [];
}

export function matchById(slug: string, matchId: string): MatchRecord | undefined {
  return matchesForSlug(slug).find((match) => match.id === matchId);
}

/** Teammates from this match the viewer never got round to rating. */
export function pendingReviews(match: MatchRecord): MatchTeammate[] {
  return match.teammates.filter((teammate) => !teammate.reviewed);
}
