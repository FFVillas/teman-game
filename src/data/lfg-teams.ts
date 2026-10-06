import { lfgRanks, type LfgRank } from "./lfg-ranks";
import { lfgRoles, type LfgRole } from "./lfg-roles";
import type { TierRange } from "@/lib/ranks";

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
  /** The leader's own rank. Orders results (M_rank); not shown on the card. */
  rank: LfgRank;
  /**
   * Ranks the leader accepts, as tier names (either end may be empty).
   * Missing means any rank. This is the one rank thing the card shows.
   */
  rankRange?: TierRange;
  lookingFor: LfgRole[];
}

export const lfgTeams: LfgTeam[] = [
  {
    id: "team-1",
    name: "MAKAN BERGIZI GRATIS",
    game: "valorant",
    cover: "/lfg/covers/valorant/1.webp",
    mode: "ranked",
    status: { label: "Active Now", isLive: true },
    region: "AP",
    languages: "ENG / IND",
    micRequired: true,
    bio: "Climbing to Radiant this act. We play clean, communicate a lot, and don't tilt after a bad round. Come ready to grind ranked together.",
    members: [
      { id: "m1", avatar: "/profile/fayaz-ilovelittle.jpg" },
      { id: "m2", avatar: "/lfg/avatars/avatar-2.jpg" },
      { id: "m3", avatar: "/lfg/avatars/avatar-3.jpg" },
    ],
    slotsFilled: 3,
    slotsTotal: 5,
    // Your own lobby (activeLobby in lfg-lobby.ts), led by the mock session.
    leaderName: "Fayaz_ILoveLittle",
    rank: lfgRanks.immortal,
    rankRange: { from: "Ascendant", to: "" },
    lookingFor: [lfgRoles.duelist, lfgRoles.initiator],
  },
  {
    id: "team-2",
    name: "KINOYYY",
    game: "valorant",
    cover: "/lfg/covers/valorant/4.webp",
    mode: "casual",
    status: { label: "Active Now", isLive: true },
    region: "AP",
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
    cover: "/lfg/covers/valorant/2.webp",
    mode: "ranked",
    status: { label: "Active Now", isLive: true },
    region: "AP",
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
    rankRange: { from: "Bronze", to: "Gold" },
    lookingFor: [lfgRoles.controller],
  },
  {
    id: "team-4",
    name: "NYAWIT.COM",
    game: "valorant",
    cover: "/lfg/covers/valorant/3.webp",
    mode: "tournament",
    status: { label: "21 May, 12:00 AM", isLive: false },
    region: "AP",
    micRequired: true,
    bio: "Prepping for an upcoming community tournament. Need a full roster with flexible role players — scrims start this week.",
    members: [{ id: "m1", avatar: "/lfg/avatars/avatar-3.jpg" }],
    slotsFilled: 4,
    slotsTotal: 5,
    leaderName: "Threshcan",
    rank: lfgRanks.ascendant,
    rankRange: { from: "Diamond", to: "" },
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
    cover: "/lfg/covers/valorant/4.webp",
    mode: "casual",
    status: { label: "Active Now", isLive: true },
    region: "AP",
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
    cover: "/lfg/covers/valorant/1.webp",
    mode: "ranked",
    status: { label: "Active Now", isLive: true },
    region: "AP",
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
    rankRange: { from: "Diamond", to: "Immortal" },
    lookingFor: [lfgRoles.duelist, lfgRoles.initiator],
  },
];
