import { lfgRanks, type LfgRank } from "./lfg-ranks";
import { lfgRoles, type LfgRole } from "./lfg-roles";
import { lfgTeams } from "./lfg-teams";

// Canonical self-declared personality tags — the vocabulary the matchmaking
// engine's Attribute Matching Ratio (Persamaan 3.4) actually compares against.
// Keep any new tag additions confined to this list so profiles stay
// matchable against a lobby leader's requested tags.
export const personalityTagOptions = [
  "Shot Caller",
  "Positive Mental Attitude",
  "Chill",
  "Never Surrender",
  "Flex Player",
] as const;

export type PersonalityTag = (typeof personalityTagOptions)[number];

export interface ConnectedAccount {
  provider: "discord" | "steam" | "riot";
  label: string;
  handle: string;
  icon: string;
}

export interface GameStat {
  game: string;
  rank: LfgRank;
  tier: string;
  lp: number;
  wins: number;
  losses: number;
  mainRole: LfgRole;
}

export interface TeamHistoryEntry {
  teamName: string;
  lobbyType: string;
  memberAvatars: string[];
  extraMembers: number;
  timeAgo: string;
}

export interface PlayerProfile {
  slug: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  /** True when this profile belongs to the currently signed-in visitor. */
  isOwner?: boolean;
  ratingScore: number;
  reviewCount: number;
  personalityTags: PersonalityTag[];
  dossier: {
    age: number;
    gender: string;
    languages: string;
    availability: string;
  };
  connections: ConnectedAccount[];
  gameStats: GameStat[];
  recentTeams: TeamHistoryEntry[];
  memberSince: string;
  lastMatch: string;
  region: string;
}

const team1 = lfgTeams.find((team) => team.id === "team-1")!;
const team2 = lfgTeams.find((team) => team.id === "team-2")!;
const team3 = lfgTeams.find((team) => team.id === "team-3")!;
const team4 = lfgTeams.find((team) => team.id === "team-4")!;
const team6 = lfgTeams.find((team) => team.id === "team-6")!;

export const playerProfiles: Record<string, PlayerProfile> = {
  yonziii: {
    slug: "yonziii",
    username: "Yonziii",
    avatar: "/lfg/avatars/avatar-1.jpg",
    isOnline: true,
    ratingScore: 4.5,
    reviewCount: 142,
    personalityTags: ["Chill", "Shot Caller"],
    dossier: {
      age: 24,
      gender: "Male",
      languages: "Indonesia (Native), Mandarin (B2)",
      availability: "Weeknights 7PM - 11PM EST",
    },
    connections: [
      {
        provider: "discord",
        label: "Discord",
        handle: "Vanguard#1337",
        icon: "/icons/player-discord.svg",
      },
      {
        provider: "steam",
        label: "Steam",
        handle: "Vanguard_X",
        icon: "/icons/player-steam.svg",
      },
      {
        provider: "riot",
        label: "Riot ID",
        handle: "SummonerName#NA1",
        icon: "/icons/player-riot.svg",
      },
    ],
    gameStats: [
      {
        game: "Valorant",
        rank: lfgRanks.immortal,
        tier: "III",
        lp: 30,
        wins: 128,
        losses: 108,
        mainRole: lfgRoles.duelist,
      },
    ],
    recentTeams: [
      {
        teamName: team1.name,
        lobbyType: "Competitive Lobby",
        memberAvatars: team1.members.map((member) => member.avatar),
        extraMembers: Math.max(team1.members.length - 2, 0),
        timeAgo: "2 hours ago",
      },
      {
        teamName: team6.name,
        lobbyType: "Competitive Lobby",
        memberAvatars: team6.members.map((member) => member.avatar),
        extraMembers: Math.max(team6.members.length - 2, 0),
        timeAgo: "1 day ago",
      },
    ],
    memberSince: "Oct 2022",
    lastMatch: "2h ago",
    region: "SG2",
  },
  fayaz_ilovelittle: {
    slug: "fayaz_ilovelittle",
    username: "Fayaz_ILoveLittle",
    avatar: "/profile/fayaz-ilovelittle.jpg",
    isOnline: true,
    isOwner: true,
    ratingScore: 4.5,
    reviewCount: 142,
    personalityTags: ["Chill", "Shot Caller"],
    dossier: {
      age: 24,
      gender: "Male",
      languages: "Indonesia (Native), Mandarin (B2)",
      availability: "Weeknights 7PM - 11PM EST",
    },
    connections: [
      {
        provider: "discord",
        label: "Discord",
        handle: "Vanguard#1337",
        icon: "/icons/player-discord.svg",
      },
      {
        provider: "steam",
        label: "Steam",
        handle: "Vanguard_X",
        icon: "/icons/player-steam.svg",
      },
      {
        provider: "riot",
        label: "Riot ID",
        handle: "SummonerName#NA1",
        icon: "/icons/player-riot.svg",
      },
    ],
    gameStats: [
      {
        game: "Valorant",
        rank: lfgRanks.immortal,
        tier: "III",
        lp: 30,
        wins: 128,
        losses: 108,
        mainRole: lfgRoles.duelist,
      },
    ],
    recentTeams: [
      {
        teamName: team1.name,
        lobbyType: "Competitive Lobby",
        memberAvatars: team1.members.map((member) => member.avatar),
        extraMembers: Math.max(team1.members.length - 2, 0),
        timeAgo: "2 hours ago",
      },
      {
        teamName: team6.name,
        lobbyType: "Competitive Lobby",
        memberAvatars: team6.members.map((member) => member.avatar),
        extraMembers: Math.max(team6.members.length - 2, 0),
        timeAgo: "1 day ago",
      },
    ],
    memberSince: "Oct 2022",
    lastMatch: "2h ago",
    region: "SG2",
  },
  tenz: {
    slug: "tenz",
    username: "Tenz",
    avatar: "/lfg/avatars/avatar-4.jpg",
    isOnline: true,
    ratingScore: 4,
    reviewCount: 87,
    personalityTags: ["Flex Player", "Positive Mental Attitude"],
    dossier: {
      age: 22,
      gender: "Male",
      languages: "English (Native)",
      availability: "Weekends, all day EST",
    },
    connections: [
      {
        provider: "discord",
        label: "Discord",
        handle: "Tenz#0001",
        icon: "/icons/player-discord.svg",
      },
      {
        provider: "steam",
        label: "Steam",
        handle: "sentinels_tenz",
        icon: "/icons/player-steam.svg",
      },
      {
        provider: "riot",
        label: "Riot ID",
        handle: "TenZ#NA1",
        icon: "/icons/player-riot.svg",
      },
    ],
    gameStats: [
      {
        game: "Valorant",
        rank: lfgRanks.radiant,
        tier: "",
        lp: 420,
        wins: 210,
        losses: 90,
        mainRole: lfgRoles.duelist,
      },
    ],
    recentTeams: [
      {
        teamName: team2.name,
        lobbyType: "Casual Lobby",
        memberAvatars: team2.members.map((member) => member.avatar),
        extraMembers: Math.max(team2.members.length - 2, 0),
        timeAgo: "5 hours ago",
      },
    ],
    memberSince: "Mar 2021",
    lastMatch: "5h ago",
    region: "SG2",
  },
  ziza: {
    slug: "ziza",
    username: "Ziza",
    avatar: "/lfg/avatars/avatar-7.jpg",
    isOnline: false,
    ratingScore: 3.5,
    reviewCount: 34,
    personalityTags: ["Never Surrender", "Chill"],
    dossier: {
      age: 20,
      gender: "Female",
      languages: "Indonesia (Native), English (B1)",
      availability: "Weeknights 8PM - 12AM WIB",
    },
    connections: [
      {
        provider: "discord",
        label: "Discord",
        handle: "ziza#2024",
        icon: "/icons/player-discord.svg",
      },
      {
        provider: "steam",
        label: "Steam",
        handle: "ziza_plays",
        icon: "/icons/player-steam.svg",
      },
      {
        provider: "riot",
        label: "Riot ID",
        handle: "Ziza#SG2",
        icon: "/icons/player-riot.svg",
      },
    ],
    gameStats: [
      {
        game: "Valorant",
        rank: lfgRanks.silver,
        tier: "II",
        lp: 40,
        wins: 52,
        losses: 61,
        mainRole: lfgRoles.controller,
      },
    ],
    recentTeams: [
      {
        teamName: team3.name,
        lobbyType: "Competitive Lobby",
        memberAvatars: team3.members.map((member) => member.avatar),
        extraMembers: Math.max(team3.members.length - 2, 0),
        timeAgo: "3 hours ago",
      },
    ],
    memberSince: "Jan 2024",
    lastMatch: "3h ago",
    region: "SG2",
  },
  threshcan: {
    slug: "threshcan",
    username: "Threshcan",
    avatar: "/lfg/avatars/avatar-3.jpg",
    isOnline: true,
    ratingScore: 4.5,
    reviewCount: 61,
    personalityTags: ["Shot Caller", "Never Surrender"],
    dossier: {
      age: 26,
      gender: "Male",
      languages: "Indonesia (Native), English (B2)",
      availability: "Weeknights 9PM - 1AM WIB",
    },
    connections: [
      {
        provider: "discord",
        label: "Discord",
        handle: "threshcan#7777",
        icon: "/icons/player-discord.svg",
      },
      {
        provider: "steam",
        label: "Steam",
        handle: "threshcan",
        icon: "/icons/player-steam.svg",
      },
      {
        provider: "riot",
        label: "Riot ID",
        handle: "Threshcan#SG2",
        icon: "/icons/player-riot.svg",
      },
    ],
    gameStats: [
      {
        game: "Valorant",
        rank: lfgRanks.ascendant,
        tier: "I",
        lp: 15,
        wins: 96,
        losses: 84,
        mainRole: lfgRoles.initiator,
      },
    ],
    recentTeams: [
      {
        teamName: team4.name,
        lobbyType: "Tournament Lobby",
        memberAvatars: team4.members.map((member) => member.avatar),
        extraMembers: Math.max(team4.members.length - 2, 0),
        timeAgo: "1 hour ago",
      },
    ],
    memberSince: "Jul 2023",
    lastMatch: "1h ago",
    region: "SG2",
  },
  kinoyyy: {
    // Seeded from their lobby record (activeLobby member "Kinoyyy" in
    // lfg-lobby.ts) — avatar, rank, role, and reputation all carried over
    // from there; the rest is a plausible best-effort fill-in.
    slug: "kinoyyy",
    username: "Kinoyyy",
    avatar: "/lfg/avatars/avatar-2.jpg",
    isOnline: true,
    ratingScore: 4.5,
    reviewCount: 58,
    personalityTags: ["Chill", "Flex Player"],
    dossier: {
      age: 23,
      gender: "Female",
      languages: "Indonesia (Native), English (B2)",
      availability: "Weeknights 8PM - 12AM WIB",
    },
    connections: [
      {
        provider: "discord",
        label: "Discord",
        handle: "kinoyyy#0420",
        icon: "/icons/player-discord.svg",
      },
      {
        provider: "steam",
        label: "Steam",
        handle: "kinoyyy",
        icon: "/icons/player-steam.svg",
      },
      {
        provider: "riot",
        label: "Riot ID",
        handle: "Kinoyyy#SG2",
        icon: "/icons/player-riot.svg",
      },
    ],
    gameStats: [
      {
        game: "Valorant",
        rank: lfgRanks.ascendant,
        tier: "II",
        lp: 55,
        wins: 74,
        losses: 68,
        mainRole: lfgRoles.sentinel,
      },
    ],
    recentTeams: [
      {
        teamName: team1.name,
        lobbyType: "Competitive Lobby",
        memberAvatars: team1.members.map((member) => member.avatar),
        extraMembers: Math.max(team1.members.length - 2, 0),
        timeAgo: "2 hours ago",
      },
    ],
    memberSince: "Nov 2023",
    lastMatch: "2h ago",
    region: "SG2",
  },
  nyawit: {
    // Seeded from their application record (activeLobby applicant "Nyawit"
    // in lfg-lobby.ts) — avatar, rank, role, and reputation carried over.
    slug: "nyawit",
    username: "Nyawit",
    avatar: "/lfg/avatars/avatar-5.jpg",
    isOnline: false,
    ratingScore: 4.4,
    reviewCount: 22,
    personalityTags: ["Flex Player", "Positive Mental Attitude"],
    dossier: {
      age: 21,
      gender: "Male",
      languages: "Indonesia (Native), English (B1)",
      availability: "Weeknights after 8PM SGT",
    },
    connections: [
      {
        provider: "discord",
        label: "Discord",
        handle: "nyawit#8899",
        icon: "/icons/player-discord.svg",
      },
      {
        provider: "steam",
        label: "Steam",
        handle: "nyawit_dotcom",
        icon: "/icons/player-steam.svg",
      },
      {
        provider: "riot",
        label: "Riot ID",
        handle: "Nyawit#SG2",
        icon: "/icons/player-riot.svg",
      },
    ],
    gameStats: [
      {
        game: "Valorant",
        rank: lfgRanks.ascendant,
        tier: "III",
        lp: 62,
        wins: 41,
        losses: 39,
        mainRole: lfgRoles.initiator,
      },
    ],
    recentTeams: [
      {
        teamName: team4.name,
        lobbyType: "Tournament Lobby",
        memberAvatars: team4.members.map((member) => member.avatar),
        extraMembers: Math.max(team4.members.length - 2, 0),
        timeAgo: "12 minutes ago",
      },
    ],
    memberSince: "Apr 2024",
    lastMatch: "12m ago",
    region: "SG2",
  },
  wokdetok: {
    // Seeded from their application record (activeLobby applicant "Wokdetok"
    // in lfg-lobby.ts) — avatar, rank, role, and reputation carried over.
    slug: "wokdetok",
    username: "Wokdetok",
    avatar: "/lfg/avatars/avatar-6.jpg",
    isOnline: true,
    ratingScore: 3.1,
    reviewCount: 9,
    personalityTags: ["Never Surrender"],
    dossier: {
      age: 19,
      gender: "Male",
      languages: "Indonesia (Native)",
      availability: "Late nights, 11PM - 2AM WIB",
    },
    connections: [
      {
        provider: "discord",
        label: "Discord",
        handle: "wokdetok#1010",
        icon: "/icons/player-discord.svg",
      },
      {
        provider: "steam",
        label: "Steam",
        handle: "wokdetok",
        icon: "/icons/player-steam.svg",
      },
      {
        provider: "riot",
        label: "Riot ID",
        handle: "Wokdetok#SG2",
        icon: "/icons/player-riot.svg",
      },
    ],
    gameStats: [
      {
        game: "Valorant",
        rank: lfgRanks.silver,
        tier: "I",
        lp: 12,
        wins: 18,
        losses: 27,
        mainRole: lfgRoles.duelist,
      },
    ],
    recentTeams: [
      {
        teamName: team3.name,
        lobbyType: "Competitive Lobby",
        memberAvatars: team3.members.map((member) => member.avatar),
        extraMembers: Math.max(team3.members.length - 2, 0),
        timeAgo: "31 minutes ago",
      },
    ],
    memberSince: "Feb 2025",
    lastMatch: "31m ago",
    region: "SG2",
  },
};

/**
 * Looks up a mock profile by display name (case-insensitive). Used to make
 * leader/member names shown elsewhere in the app — e.g. LFG team cards —
 * link through to their profile page when we have one on file.
 */
export function findProfileByUsername(
  username: string
): PlayerProfile | undefined {
  const target = username.trim().toLowerCase();
  return Object.values(playerProfiles).find(
    (profile) => profile.username.toLowerCase() === target
  );
}
