import { lfgRanks, type LfgRank } from "./lfg-ranks";
import { lfgRoles, type LfgRole } from "./lfg-roles";
import type { PersonalityTag } from "./player-profiles";

/**
 * Players a lobby leader can invite, with the fields the recommendation
 * engine reads. Mirrors a join of `user` + `user_game_mapping` (rank, main
 * role) + profile playstyle/tags + the reviews average.
 *
 * Names reuse people from the social mock data so rows link to a profile.
 * CarryPotter and LagSwitch are included on purpose: they're suspended /
 * banned in the admin seed, and the invite list must filter them out.
 */
export interface LfgCandidate {
  id: string;
  name: string;
  avatar: string;
  rank: LfgRank;
  division: number;
  role: LfgRole;
  /** 1 = very casual … 5 = very competitive. */
  playstyle: number;
  reputation: number;
  reviewCount: number;
  tags: PersonalityTag[];
  isOnline: boolean;
  micOn: boolean;
  region: string;
}

export const lfgCandidates: LfgCandidate[] = [
  {
    id: "c-shadowstrike",
    name: "ShadowStrike",
    avatar: "/lfg/avatars/avatar-2.jpg",
    rank: lfgRanks.immortal,
    division: 2,
    role: lfgRoles.duelist,
    playstyle: 4,
    reputation: 4.7,
    reviewCount: 88,
    tags: ["Shot Caller", "Positive Mental Attitude"],
    isOnline: true,
    micOn: true,
    region: "SG2",
  },
  {
    id: "c-healermain",
    name: "HealerMain",
    avatar: "/lfg/avatars/avatar-3.jpg",
    rank: lfgRanks.ascendant,
    division: 3,
    role: lfgRoles.initiator,
    playstyle: 4,
    reputation: 4.8,
    reviewCount: 64,
    tags: ["Positive Mental Attitude", "Flex Player"],
    isOnline: true,
    micOn: true,
    region: "SG2",
  },
  {
    id: "c-noscopegod",
    name: "NoScopeGod",
    avatar: "/lfg/avatars/avatar-4.jpg",
    rank: lfgRanks.immortal,
    division: 3,
    role: lfgRoles.duelist,
    playstyle: 5,
    reputation: 3.8,
    reviewCount: 14,
    tags: ["Never Surrender"],
    isOnline: true,
    micOn: false,
    region: "SG2",
  },
  {
    id: "c-sneakybeaky",
    name: "SneakyBeaky",
    avatar: "/lfg/avatars/avatar-5.jpg",
    rank: lfgRanks.ascendant,
    division: 1,
    role: lfgRoles.initiator,
    playstyle: 3,
    reputation: 4.3,
    reviewCount: 41,
    tags: ["Chill", "Flex Player"],
    isOnline: false,
    micOn: true,
    region: "SG2",
  },
  {
    id: "c-nightowl",
    name: "NightOwl",
    avatar: "/lfg/avatars/avatar-7.jpg",
    rank: lfgRanks.immortal,
    division: 1,
    role: lfgRoles.sentinel,
    playstyle: 4,
    reputation: 4.2,
    reviewCount: 29,
    tags: ["Shot Caller"],
    isOnline: false,
    micOn: true,
    region: "SG2",
  },
  {
    id: "c-quickscope",
    name: "QuickScope",
    avatar: "/lfg/avatars/avatar-2.jpg",
    rank: lfgRanks.silver,
    division: 2,
    role: lfgRoles.duelist,
    playstyle: 2,
    reputation: 4.6,
    reviewCount: 19,
    tags: ["Chill", "Positive Mental Attitude"],
    isOnline: true,
    micOn: true,
    region: "SG2",
  },
  {
    id: "c-ghostrecon",
    name: "GhostRecon",
    avatar: "/lfg/avatars/avatar-3.jpg",
    rank: lfgRanks.radiant,
    division: 1,
    role: lfgRoles.initiator,
    playstyle: 5,
    reputation: 3.4,
    reviewCount: 52,
    tags: ["Shot Caller", "Never Surrender"],
    isOnline: true,
    micOn: true,
    region: "SG2",
  },
  {
    id: "c-pixelpirate",
    name: "PixelPirate",
    avatar: "/lfg/avatars/avatar-4.jpg",
    rank: lfgRanks.ascendant,
    division: 2,
    role: lfgRoles.sentinel,
    playstyle: 3,
    reputation: 4.0,
    reviewCount: 23,
    tags: ["Flex Player"],
    isOnline: true,
    micOn: false,
    region: "SG2",
  },
  {
    id: "c-carrypotter",
    name: "CarryPotter",
    avatar: "/lfg/avatars/avatar-6.jpg",
    rank: lfgRanks.immortal,
    division: 1,
    role: lfgRoles.duelist,
    playstyle: 4,
    reputation: 3.9,
    reviewCount: 11,
    tags: ["Shot Caller"],
    isOnline: true,
    micOn: true,
    region: "SG2",
  },
  {
    id: "c-lagswitch",
    name: "LagSwitch",
    avatar: "/lfg/avatars/avatar-5.jpg",
    rank: lfgRanks.radiant,
    division: 1,
    role: lfgRoles.duelist,
    playstyle: 5,
    reputation: 2.2,
    reviewCount: 18,
    tags: ["Never Surrender"],
    isOnline: true,
    micOn: true,
    region: "SG2",
  },
];

/** Min-reputation filter steps offered in the invite panel. */
export const reputationFilterOptions = [
  { value: 0, label: "Any rating" },
  { value: 3.5, label: "3.5★ and up" },
  { value: 4, label: "4.0★ and up" },
  { value: 4.5, label: "4.5★ and up" },
];
