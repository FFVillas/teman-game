import { lfgRanks, type LfgRank } from "./lfg-ranks";
import { lfgRoles, type LfgRole } from "./lfg-roles";
import type { LfgMode } from "./lfg-teams";
import type { PersonalityTag } from "./player-profiles";

/**
 * The signed-in player in the mock session (the account the login form signs
 * you into). Replace with `session.user.id` once auth is real — every "is
 * this me?" check in the lobby screens goes through this.
 */
export const CURRENT_PLAYER_ID = "u-me";

/**
 * The lobby a user is currently inside, plus everything the detail screen
 * needs. Shapes mirror the `lobby`, `applications`, `lobby_messages` and
 * `user_game_mapping` entities in the thesis ERD — see docs/thesis-spec.md.
 *
 * Note the proposal calls this a "lobby"; the discovery list calls the same
 * thing a "team" (LfgTeam). Same entity, two names.
 */

/** Lifecycle of a lobby, matching `lobby.status` in the ERD. */
export type LobbyStatus = "forming" | "live" | "completed";

/**
 * How the viewer relates to this lobby. "invited" is a real third state:
 * you can see the lobby because someone asked you in, but you are not a
 * member until you accept.
 */
export type LobbyViewerRole = "leader" | "member" | "invited";

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export interface LobbyMember {
  id: string;
  name: string;
  avatar: string;
  rank: LfgRank;
  role: LfgRole;
  /** Per-lobby, not a global account flag — the leader is whoever created it. */
  isLeader: boolean;
  micOn: boolean;
  /** Community rating, 1.0–5.0. Feeds `R` in the compatibility score. */
  reputation: number;
}

export interface LobbyApplication {
  id: string;
  status: ApplicationStatus;
  applicantName: string;
  avatar: string;
  rank: LfgRank;
  role: LfgRole;
  reputation: number;
  message?: string;
  appliedAgo: string;
  /**
   * S_total from the recommendation engine, 0.00–1.00. Surfacing it here is
   * the point of the algorithm being explainable — the leader can see *why*
   * an applicant is ranked where they are.
   */
  matchScore: number;
}

export interface LobbyMessage {
  id: string;
  authorId: string;
  authorName: string;
  avatar?: string;
  body: string;
  sentAt: string;
  /** Lifecycle events rendered inline (member joined, lobby started, …). */
  isSystem?: boolean;
}

export interface Lobby {
  id: string;
  name: string;
  game: string;
  cover: string;
  mode: LfgMode;
  status: LobbyStatus;
  region: string;
  languages?: string;
  micRequired: boolean;
  bio: string;
  rank: LfgRank;
  lookingFor: LfgRole[];
  slotsTotal: number;
  leaderId: string;
  /** Players the leader has invited who haven't answered yet. */
  invitedIds: string[];
  /**
   * Recommendation-engine inputs set by the leader (see lib/recommendation):
   * playstyle on the 1–5 Likert scale, up to 3 wanted personality tags, and
   * the division of `rank` used as the lobby's minimum.
   */
  playstyle: number;
  wantedTags: PersonalityTag[];
  rankDivision: number;
  /** Present when the lobby is scheduled rather than running now. */
  scheduledFor?: string;
  discordUrl?: string;
  members: LobbyMember[];
  applications: LobbyApplication[];
  messages: LobbyMessage[];
}

/** How the signed-in player appears on a roster. */
export const currentPlayerMember: LobbyMember = {
  id: CURRENT_PLAYER_ID,
  name: "Fayaz_ILoveLittle",
  avatar: "/profile/fayaz-ilovelittle.jpg",
  rank: lfgRanks.immortal,
  role: lfgRoles.duelist,
  isLeader: false,
  micOn: true,
  reputation: 4.5,
};

/**
 * A user can only be in one running lobby at a time, but may hold several
 * scheduled ones — hence one `activeLobby` and a list of `scheduledLobbies`.
 */
export const activeLobby: Lobby = {
  id: "lobby-1",
  name: "MAKAN BERGIZI GRATIS",
  game: "valorant",
  cover: "/lfg/covers/valorant-cover-1.jpg",
  mode: "ranked",
  status: "forming",
  region: "SG2",
  languages: "ENG / IND",
  micRequired: true,
  bio: "Climbing to Radiant this act. We play clean, communicate a lot, and don't tilt after a bad round. Come ready to grind ranked together.",
  rank: lfgRanks.immortal,
  lookingFor: [lfgRoles.duelist, lfgRoles.initiator],
  slotsTotal: 5,
  leaderId: CURRENT_PLAYER_ID,
  invitedIds: [],
  playstyle: 4,
  wantedTags: ["Shot Caller", "Positive Mental Attitude"],
  rankDivision: 1,
  discordUrl: "https://discord.gg/temangame",
  members: [
    { ...currentPlayerMember, isLeader: true },
    {
      id: "u-2",
      name: "Kinoyyy",
      avatar: "/lfg/avatars/avatar-2.jpg",
      rank: lfgRanks.ascendant,
      role: lfgRoles.sentinel,
      isLeader: false,
      micOn: true,
      reputation: 4.5,
    },
    {
      id: "u-3",
      name: "Ziza",
      avatar: "/lfg/avatars/avatar-3.jpg",
      rank: lfgRanks.immortal,
      role: lfgRoles.duelist,
      isLeader: false,
      micOn: false,
      reputation: 4.2,
    },
  ],
  applications: [
    {
      id: "app-1",
      status: "pending",
      applicantName: "Threshcan",
      avatar: "/lfg/avatars/avatar-4.jpg",
      rank: lfgRanks.immortal,
      role: lfgRoles.duelist,
      reputation: 4.9,
      message:
        "Immortal 2 duelist main, been playing Jett since beta. Free most nights after 8PM SGT.",
      appliedAgo: "4m ago",
      matchScore: 0.92,
    },
    {
      id: "app-2",
      status: "pending",
      applicantName: "Nyawit",
      avatar: "/lfg/avatars/avatar-5.jpg",
      rank: lfgRanks.ascendant,
      role: lfgRoles.initiator,
      reputation: 4.4,
      message: "Can flex initiator or controller. Happy to IGL if you need one.",
      appliedAgo: "12m ago",
      matchScore: 0.78,
    },
    {
      id: "app-3",
      status: "pending",
      applicantName: "Wokdetok",
      avatar: "/lfg/avatars/avatar-6.jpg",
      rank: lfgRanks.silver,
      role: lfgRoles.duelist,
      reputation: 3.1,
      message: "let me in",
      appliedAgo: "31m ago",
      matchScore: 0.24,
    },
  ],
  messages: [
    {
      id: "m-1",
      authorId: "system",
      authorName: "System",
      body: "Lobby created by Fayaz_ILoveLittle",
      sentAt: "20:04",
      isSystem: true,
    },
    {
      id: "m-2",
      authorId: CURRENT_PLAYER_ID,
      authorName: "Fayaz_ILoveLittle",
      avatar: "/profile/fayaz-ilovelittle.jpg",
      body: "yo, hop in the Discord when you're ready",
      sentAt: "20:06",
    },
    {
      id: "m-3",
      authorId: "system",
      authorName: "System",
      body: "Ziza joined the lobby",
      sentAt: "20:08",
      isSystem: true,
    },
    {
      id: "m-4",
      authorId: "u-2",
      authorName: "Kinoyyy",
      avatar: "/lfg/avatars/avatar-2.jpg",
      body: "gimme 5, finishing a game",
      sentAt: "20:09",
    },
    {
      id: "m-5",
      authorId: "u-3",
      authorName: "Ziza",
      avatar: "/lfg/avatars/avatar-3.jpg",
      body: "im on controller if nobody wants it",
      sentAt: "20:11",
    },
  ],
};

/** Scheduled lobbies don't block each other, so a user can hold several. */
export const scheduledLobbies: Lobby[] = [
  {
    id: "lobby-2",
    name: "NYAWIT.COM",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-3.jpg",
    mode: "tournament",
    status: "forming",
    region: "SG2",
    micRequired: true,
    bio: "Prepping for an upcoming community tournament. Scrims start this week.",
    rank: lfgRanks.ascendant,
    lookingFor: [lfgRoles.sentinel],
    slotsTotal: 5,
    leaderId: "u-9",
    invitedIds: [],
    playstyle: 5,
    wantedTags: ["Shot Caller", "Never Surrender"],
    rankDivision: 1,
    scheduledFor: "21 May, 12:00 AM",
    members: [
      {
        id: "u-9",
        name: "Threshcan",
        avatar: "/lfg/avatars/avatar-4.jpg",
        rank: lfgRanks.ascendant,
        role: lfgRoles.initiator,
        isLeader: true,
        micOn: true,
        reputation: 4.9,
      },
      {
        id: "u-2",
        name: "Kinoyyy",
        avatar: "/lfg/avatars/avatar-2.jpg",
        rank: lfgRanks.ascendant,
        role: lfgRoles.sentinel,
        isLeader: false,
        micOn: true,
        reputation: 4.5,
      },
      currentPlayerMember,
    ],
    applications: [],
    messages: [
      {
        id: "s2-1",
        authorId: "u-9",
        authorName: "Threshcan",
        avatar: "/lfg/avatars/avatar-4.jpg",
        body: "scrims start thursday, be on 15 min early",
        sentAt: "Mon 21:10",
      },
    ],
  },
];

/**
 * Lobbies someone has invited you to. You can open them and read who's in,
 * but you're not on the roster until you accept.
 */
export const invitedLobbies: Lobby[] = [
  {
    id: "lobby-4",
    name: "KINOYYY",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-4.jpg",
    mode: "casual",
    status: "forming",
    region: "SG2",
    micRequired: true,
    bio: "Chill casual squad, no pressure. We just want good vibes, some laughs, and the occasional clutch. All ranks welcome.",
    rank: lfgRanks.silver,
    lookingFor: [lfgRoles.duelist, lfgRoles.sentinel],
    slotsTotal: 5,
    leaderId: "u-10",
    invitedIds: [CURRENT_PLAYER_ID],
    playstyle: 2,
    wantedTags: [],
    rankDivision: 1,
    scheduledFor: "Tonight, 9:00 PM",
    members: [
      {
        id: "u-10",
        name: "Tenz",
        avatar: "/lfg/avatars/avatar-4.jpg",
        rank: lfgRanks.radiant,
        role: lfgRoles.controller,
        isLeader: true,
        micOn: true,
        reputation: 4.0,
      },
      {
        id: "u-11",
        name: "Nyawit",
        avatar: "/lfg/avatars/avatar-5.jpg",
        rank: lfgRanks.ascendant,
        role: lfgRoles.initiator,
        isLeader: false,
        micOn: true,
        reputation: 4.4,
      },
    ],
    applications: [],
    messages: [
      {
        id: "i4-1",
        authorId: "system",
        authorName: "System",
        body: "Lobby created by Tenz",
        sentAt: "19:40",
        isSystem: true,
      },
      {
        id: "i4-2",
        authorId: "u-10",
        authorName: "Tenz",
        avatar: "/lfg/avatars/avatar-4.jpg",
        body: "sent you an invite fayaz, we need a duelist tonight",
        sentAt: "19:42",
      },
    ],
  },
];

/** Positive attributes from the proposal's personality tag set. */
export const reviewTags = [
  "Team Player",
  "Shot Caller",
  "Positive Attitude",
  "Good Comms",
  "Never Surrender",
  "Flex Player",
];

/**
 * The first four mirror the negative behaviours the questionnaire surfaced
 * most often (AFK 89.7%, flaming 70.7%, trolling 62.1%, verbal abuse 58.6%);
 * the rest cover violations an admin still has to be able to action.
 */
export const reportReasons = [
  "AFK / left the game",
  "Flaming / verbal provocation",
  "Trolling / intentional sabotage",
  "Verbal abuse or harassment",
  "Hate speech or discrimination",
  "Cheating / third-party software",
  "Inappropriate profile content",
  "Other",
];

/**
 * Minimum a report form needs to identify who's being reported. Kept looser
 * than LobbyMember so reports can also be filed from a profile or a finished
 * match, not just from inside a live lobby.
 */
export interface ReportTarget {
  id: string;
  name: string;
  avatar: string;
  rank?: LfgRank;
}

/** Everything a moderator needs to action a ticket. Mirrors `reports`. */
export interface ReportSubmission {
  targetId: string;
  reason: string;
  details: string;
  /** Screenshot or clip. Not uploaded yet — no storage bucket exists. */
  evidenceFileName?: string;
  evidenceUrl?: string;
  /** Set when the report comes from a known lobby, per `reports.lobby_id`. */
  lobbyId?: string;
}

export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_ACCEPT = "image/png,image/jpeg,video/mp4";

export const allLobbies: Lobby[] = [
  activeLobby,
  ...scheduledLobbies,
  ...invitedLobbies,
];

export function lobbyById(id: string): Lobby | undefined {
  return allLobbies.find((lobby) => lobby.id === id);
}

/**
 * How a player relates to a lobby, from the data alone — the same check the
 * backend will make (`lobby.leader_id`, lobby membership, pending invite).
 * Null means they have no business on this lobby's page.
 */
export function viewerRoleIn(
  lobby: Lobby,
  playerId: string
): LobbyViewerRole | null {
  if (lobby.leaderId === playerId) return "leader";
  if (lobby.members.some((member) => member.id === playerId)) return "member";
  if (lobby.invitedIds.includes(playerId)) return "invited";
  return null;
}
