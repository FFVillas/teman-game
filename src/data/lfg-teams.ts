import type { LfgRank } from "./lfg-ranks";
import type { LfgRole } from "./lfg-roles";
import type { TierRange } from "@/lib/ranks";

export type LfgMode = "ranked" | "casual" | "tournament";

export interface LfgMember {
  id: string;
  /** Empty when the player has no picture; render an initial instead. */
  avatar: string;
  name?: string;
  /** Star average shown to players (Persamaan 3.12); null before any rating. Real lobbies only. */
  rating?: number | null;
  /** Rated by fewer than five different players. Real lobbies only. */
  isNew?: boolean;
}

export interface LfgTeam {
  id: string;
  name: string;
  game: string;
  cover: string;
  mode: LfgMode;
  /** The mode's own name ("Competitive", "Premier"…); real lobbies only. The badge shows this. */
  modeLabel?: string;
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
  // Set only on lobbies read from the database:
  /** The leader's profile id. Its presence means the lobby is real. */
  leaderId?: string;
  /** `game_modes.value`, e.g. "competitive". */
  modeValue?: string;
  /** Ladder positions of everyone in the lobby who has a rank set. */
  memberOrdinals?: number[];
  /** True once the lobby is over: cancelled (closed) or ended after playing (completed). */
  closed?: boolean;
  /** True when it ended after being started, as opposed to being cancelled. */
  completed?: boolean;
  /** True once the leader has started the lobby: playing, no new members. */
  started?: boolean;
  /**
   * How the signed-in viewer relates to this lobby: leading it, on the
   * roster, waiting on an application, or turned down. Absent for visitors.
   */
  viewerState?: "leader" | "member" | "pending" | "declined";
  /** What the edit form needs to start from. */
  modeId?: number;
  tags?: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  /** Pb in Persamaan 3.2. Real lobbies only; null until the leader sets it. */
  playstyle?: number | null;
  /** The leader's own playstyle: Pb's stand-in while the lobby has none. */
  leaderPlaystyle?: number | null;
  /** R* (Persamaan 3.10) of everyone in the lobby, for R_lobi (3.4). */
  memberReputations?: number[];
  /** The leader is under an active suspension: kept out of recommendations. */
  leaderSuspended?: boolean;
  /** Set B in Persamaan 3.14 — tag ids, at most three. Real lobbies only. */
  wantedTagIds?: number[];
}
