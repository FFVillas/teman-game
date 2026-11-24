import type { LfgRank } from "./lfg-ranks";
import type { LfgRole } from "./lfg-roles";
import type { PlayerGameSetup } from "@/lib/games";
import type { SanctionEntry } from "@/lib/reputation";

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
  // Added by 20261124000000_more_tags.sql; the names must match `tag.name`.
  "Talkative",
  "Introverted",
  "Humorous",
  "Serious",
  "Focused",
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
  /** The account's id; only real profiles carry it. */
  userId?: string;
  slug: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  /** True when this profile belongs to the currently signed-in visitor. */
  isOwner?: boolean;
  /** Built from a name + avatar only — see data/profile-lookup.ts. */
  isPlaceholder?: boolean;
  ratingScore: number;
  reviewCount: number;
  /** Different players who rated them; real profiles only. Under 5 is "New player". */
  raterCount?: number;
  /** Public sanction history; real profiles only. */
  sanctions?: SanctionEntry[];
  personalityTags: PersonalityTag[];
  /** 1 (very casual) – 5 (very competitive). Only real profiles carry it. */
  playstyle?: number;
  dossier: {
    age: number;
    gender: string;
    languages: string;
    availability: string;
  };
  connections: ConnectedAccount[];
  /**
   * What a real player saved per game (rank, region, roles). Present only on
   * profiles read from the database; the mock profiles use `gameStats`.
   */
  gameSetups?: PlayerGameSetup[];
  gameStats: GameStat[];
  recentTeams: TeamHistoryEntry[];
  memberSince: string;
  lastMatch: string;
  region: string;
}
