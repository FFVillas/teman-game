import { lfgRanks, type LfgRank } from "./lfg-ranks";
import { lfgRoles, type LfgRole } from "./lfg-roles";

export type LfgMode = "ranked" | "casual" | "tournament";

export interface LfgMember {
  id: string;
  avatar: string;
}

export interface LfgTeam {
  id: string;
  name: string;
  game: string;
  cover: string;
  mode: LfgMode;
  status: {
    label: string;
    isLive: boolean;
  };
  region: string;
  languages?: string;
  micRequired?: boolean;
  bio?: string;
  members: LfgMember[];
  slotsFilled: number;
  slotsTotal: number;
  leaderName: string;
  rank: LfgRank;
  lookingFor: LfgRole[];
}

export const lfgTeams: LfgTeam[] = [
  {
    id: "team-1",
    name: "MAKAN BERGIZI GRATIS",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-1.jpg",
    mode: "ranked",
    status: { label: "Active Now", isLive: true },
    region: "SG2",
    languages: "ENG / IND",
    micRequired: true,
    bio: "Climbing to Radiant this act. We play clean, communicate a lot, and don't tilt after a bad round. Come ready to grind ranked together.",
    members: [
      { id: "m1", avatar: "/lfg/avatars/avatar-1.jpg" },
      { id: "m2", avatar: "/lfg/avatars/avatar-2.jpg" },
      { id: "m3", avatar: "/lfg/avatars/avatar-3.jpg" },
    ],
    slotsFilled: 3,
    slotsTotal: 5,
    leaderName: "Yonziii",
    rank: lfgRanks.immortal,
    lookingFor: [lfgRoles.duelist, lfgRoles.initiator],
  },
  {
    id: "team-2",
    name: "KINOYYY",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-4.jpg",
    mode: "casual",
    status: { label: "Active Now", isLive: true },
    region: "SG2",
    micRequired: true,
    bio: "Chill casual squad, no pressure. We just want good vibes, some laughs, and the occasional clutch. All ranks welcome.",
    members: [
      { id: "m1", avatar: "/lfg/avatars/avatar-4.jpg" },
      { id: "m2", avatar: "/lfg/avatars/avatar-5.jpg" },
    ],
    slotsFilled: 2,
    slotsTotal: 5,
    leaderName: "Tenz",
    rank: lfgRanks.radiant,
    lookingFor: [lfgRoles.duelist, lfgRoles.sentinel, lfgRoles.initiator],
  },
  {
    id: "team-3",
    name: "WOKDETOK",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-2.jpg",
    mode: "ranked",
    status: { label: "Active Now", isLive: true },
    region: "SG2",
    bio: "Learning-focused team working our way up from Silver. Looking for a Controller main who's patient with callouts and open to VOD review.",
    members: [
      { id: "m1", avatar: "/lfg/avatars/avatar-6.jpg" },
      { id: "m2", avatar: "/lfg/avatars/avatar-7.jpg" },
      { id: "m3", avatar: "/lfg/avatars/avatar-1.jpg" },
      { id: "m4", avatar: "/lfg/avatars/avatar-2.jpg" },
    ],
    slotsFilled: 4,
    slotsTotal: 5,
    leaderName: "Ziza",
    rank: lfgRanks.silver,
    lookingFor: [lfgRoles.controller],
  },
  {
    id: "team-4",
    name: "NYAWIT.COM",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-3.jpg",
    mode: "tournament",
    status: { label: "21 May, 12:00 AM", isLive: false },
    region: "SG2",
    micRequired: true,
    bio: "Prepping for an upcoming community tournament. Need a full roster with flexible role players — scrims start this week.",
    members: [{ id: "m1", avatar: "/lfg/avatars/avatar-3.jpg" }],
    slotsFilled: 4,
    slotsTotal: 5,
    leaderName: "Threshcan",
    rank: lfgRanks.ascendant,
    lookingFor: [
      lfgRoles.duelist,
      lfgRoles.initiator,
      lfgRoles.sentinel,
      lfgRoles.controller,
    ],
  },
  {
    id: "team-5",
    name: "KINOYYY",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-4.jpg",
    mode: "casual",
    status: { label: "Active Now", isLive: true },
    region: "SG2",
    micRequired: true,
    bio: "Chill casual squad, no pressure. We just want good vibes, some laughs, and the occasional clutch. All ranks welcome.",
    members: [
      { id: "m1", avatar: "/lfg/avatars/avatar-4.jpg" },
      { id: "m2", avatar: "/lfg/avatars/avatar-5.jpg" },
    ],
    slotsFilled: 2,
    slotsTotal: 5,
    leaderName: "Tenz",
    rank: lfgRanks.radiant,
    lookingFor: [lfgRoles.duelist, lfgRoles.sentinel, lfgRoles.initiator],
  },
  {
    id: "team-6",
    name: "Shadow Stalkers",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-1.jpg",
    mode: "ranked",
    status: { label: "Active Now", isLive: true },
    region: "SG2",
    micRequired: true,
    bio: "Competitive-minded and consistent — we queue most nights after 8PM SGT. Looking for teammates who take fights seriously but keep comms positive.",
    members: [
      { id: "m1", avatar: "/lfg/avatars/avatar-1.jpg" },
      { id: "m2", avatar: "/lfg/avatars/avatar-6.jpg" },
      { id: "m3", avatar: "/lfg/avatars/avatar-7.jpg" },
    ],
    slotsFilled: 3,
    slotsTotal: 5,
    leaderName: "Yonziii",
    rank: lfgRanks.immortal,
    lookingFor: [lfgRoles.duelist, lfgRoles.initiator],
  },
];
