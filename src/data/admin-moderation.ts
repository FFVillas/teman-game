import { lfgRanks, type LfgRank } from "./lfg-ranks";
import type { LfgMode } from "./lfg-teams";
import {
  activeLobby,
  reportReasons,
  type LobbyMessage,
  type LobbyStatus,
} from "./lfg-lobby";

/**
 * Everything the admin console reads and writes. Shapes mirror the tables
 * the console needs — see docs/admin-console.md:
 *
 *   user        → AdminPlayer   (account status is *derived* from sanctions)
 *   lobby       → AdminLobby
 *   reports     → AdminReport   (+ status / resolution columns)
 *   sanctions   → Sanction      (new table, not in the original 13-entity ERD)
 *   admin_actions → AdminAction (new table — the audit log)
 *
 * Seed timestamps are generated relative to when this module loads, so the
 * queue always reads as "recent" in a demo. Admin pages only render after the
 * client-side session check, so this never causes a hydration mismatch.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountStatus = "active" | "warned" | "suspended" | "banned";

export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";

/** Where the reporter was when they filed it. */
export type ReportSource = "lobby" | "profile" | "match";

export type ReportSeverity = "high" | "normal";

export type SanctionType = "warning" | "suspension" | "ban";

export type AdminLobbyStatus = LobbyStatus | "closed";

export interface AdminPlayer {
  id: string;
  username: string;
  avatar: string;
  email: string;
  region: string;
  joinedAt: string;
  lastActiveAt: string;
  /** Average stars, or null before their first review. */
  reputation: number | null;
  reviewCount: number;
  rank?: LfgRank;
  mainGame: string;
}

export interface ReportResolution {
  outcome: "sanctioned" | "dismissed";
  sanctionId?: string;
  note: string;
  resolvedBy: string;
  resolvedAt: string;
}

export interface AdminReport {
  id: string;
  status: ReportStatus;
  reason: string;
  details: string;
  evidenceFileName?: string;
  reporterId: string;
  targetId: string;
  source: ReportSource;
  lobbyId?: string;
  createdAt: string;
  /** The admin who claimed it — stops two moderators working one case. */
  assignedTo?: string;
  resolution?: ReportResolution;
}

export interface Sanction {
  id: string;
  playerId: string;
  type: SanctionType;
  /** Suspensions only. */
  durationDays?: number;
  reason: string;
  /** Internal note. Never shown to the player. */
  note: string;
  reportIds: string[];
  issuedBy: string;
  issuedAt: string;
  expiresAt?: string;
  liftedAt?: string;
  liftedBy?: string;
  liftReason?: string;
}

export interface AdminLobby {
  id: string;
  name: string;
  game: string;
  cover: string;
  mode: LfgMode;
  status: AdminLobbyStatus;
  region: string;
  leaderId: string;
  memberIds: string[];
  slotsTotal: number;
  createdAt: string;
  closedAt?: string;
  closedBy?: string;
  closedReason?: string;
  messages: LobbyMessage[];
}

export type AdminActionType =
  | "report_claimed"
  | "report_dismissed"
  | "sanction_issued"
  | "sanction_lifted"
  | "lobby_closed"
  | "member_removed";

export interface AdminAction {
  id: string;
  adminId: string;
  type: AdminActionType;
  targetType: "player" | "lobby" | "report";
  targetId: string;
  /** Human-readable summary, e.g. "7-day suspension". */
  summary: string;
  reason: string;
  at: string;
}

export interface AdminData {
  players: AdminPlayer[];
  reports: AdminReport[];
  sanctions: Sanction[];
  lobbies: AdminLobby[];
  actions: AdminAction[];
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

/**
 * Triage order. Harm to other people and cheating jump the queue; the rest
 * are worked oldest-first.
 */
const highSeverityReasons = new Set([
  "Hate speech or discrimination",
  "Verbal abuse or harassment",
  "Cheating / third-party software",
]);

export function reasonSeverity(reason: string): ReportSeverity {
  return highSeverityReasons.has(reason) ? "high" : "normal";
}

export { reportReasons };

/** A warning keeps an account "warned" for this long. */
export const WARNING_WINDOW_DAYS = 90;

export const suspensionDurations = [1, 3, 7, 30] as const;

export const sanctionLabels: Record<SanctionType, string> = {
  warning: "Warning",
  suspension: "Suspension",
  ban: "Permanent ban",
};

export const MIN_ADMIN_NOTE_LENGTH = 10;

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const loadedAt = Date.now();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function ago(ms: number): string {
  return new Date(loadedAt - ms).toISOString();
}

function fromNow(ms: number): string {
  return new Date(loadedAt + ms).toISOString();
}

const seedPlayers: AdminPlayer[] = [
  {
    id: "yonziii",
    username: "Yonziii",
    avatar: "/lfg/avatars/avatar-1.jpg",
    email: "yonziii@mail.com",
    region: "SG2",
    joinedAt: ago(700 * DAY),
    lastActiveAt: ago(8 * MINUTE),
    reputation: 4.5,
    reviewCount: 142,
    rank: lfgRanks.immortal,
    mainGame: "Valorant",
  },
  {
    id: "fayaz_ilovelittle",
    username: "Fayaz_ILoveLittle",
    avatar: "/profile/fayaz-ilovelittle.jpg",
    email: "fayaz@mail.com",
    region: "SG2",
    joinedAt: ago(690 * DAY),
    lastActiveAt: ago(2 * HOUR),
    reputation: 4.5,
    reviewCount: 142,
    rank: lfgRanks.immortal,
    mainGame: "Valorant",
  },
  {
    id: "tenz",
    username: "Tenz",
    avatar: "/lfg/avatars/avatar-4.jpg",
    email: "tenz@mail.com",
    region: "SG2",
    joinedAt: ago(1200 * DAY),
    lastActiveAt: ago(5 * HOUR),
    reputation: 4.0,
    reviewCount: 87,
    rank: lfgRanks.radiant,
    mainGame: "Valorant",
  },
  {
    id: "ziza",
    username: "Ziza",
    avatar: "/lfg/avatars/avatar-7.jpg",
    email: "ziza@mail.com",
    region: "SG2",
    joinedAt: ago(250 * DAY),
    lastActiveAt: ago(30 * MINUTE),
    reputation: 3.5,
    reviewCount: 34,
    rank: lfgRanks.silver,
    mainGame: "Valorant",
  },
  {
    id: "threshcan",
    username: "Threshcan",
    avatar: "/lfg/avatars/avatar-3.jpg",
    email: "threshcan@mail.com",
    region: "SG2",
    joinedAt: ago(420 * DAY),
    lastActiveAt: ago(1 * HOUR),
    reputation: 4.5,
    reviewCount: 61,
    rank: lfgRanks.ascendant,
    mainGame: "Valorant",
  },
  {
    id: "kinoyyy",
    username: "Kinoyyy",
    avatar: "/lfg/avatars/avatar-2.jpg",
    email: "kinoyyy@mail.com",
    region: "SG2",
    joinedAt: ago(300 * DAY),
    lastActiveAt: ago(20 * MINUTE),
    reputation: 4.5,
    reviewCount: 58,
    rank: lfgRanks.ascendant,
    mainGame: "Valorant",
  },
  {
    id: "nyawit",
    username: "Nyawit",
    avatar: "/lfg/avatars/avatar-5.jpg",
    email: "nyawit@mail.com",
    region: "SG2",
    joinedAt: ago(160 * DAY),
    lastActiveAt: ago(12 * MINUTE),
    reputation: 4.4,
    reviewCount: 22,
    rank: lfgRanks.ascendant,
    mainGame: "Valorant",
  },
  {
    id: "wokdetok",
    username: "Wokdetok",
    avatar: "/lfg/avatars/avatar-6.jpg",
    email: "wokdetok@mail.com",
    region: "SG2",
    joinedAt: ago(95 * DAY),
    lastActiveAt: ago(31 * MINUTE),
    reputation: 3.1,
    reviewCount: 9,
    rank: lfgRanks.silver,
    mainGame: "Valorant",
  },
  {
    id: "noscopegod",
    username: "NoScopeGod",
    avatar: "/lfg/avatars/avatar-4.jpg",
    email: "noscopegod@mail.com",
    region: "SG2",
    joinedAt: ago(70 * DAY),
    lastActiveAt: ago(3 * HOUR),
    reputation: 3.8,
    reviewCount: 14,
    mainGame: "Valorant",
  },
  {
    id: "shadowstrike",
    username: "ShadowStrike",
    avatar: "/lfg/avatars/avatar-2.jpg",
    email: "shadowstrike@mail.com",
    region: "SG2",
    joinedAt: ago(210 * DAY),
    lastActiveAt: ago(19 * HOUR),
    reputation: 4.1,
    reviewCount: 27,
    mainGame: "Valorant",
  },
  {
    id: "carrypotter",
    username: "CarryPotter",
    avatar: "/lfg/avatars/avatar-6.jpg",
    email: "carrypotter@mail.com",
    region: "SG2",
    joinedAt: ago(130 * DAY),
    lastActiveAt: ago(1 * DAY),
    reputation: 3.9,
    reviewCount: 11,
    mainGame: "Valorant",
  },
  {
    id: "lagswitch",
    username: "LagSwitch",
    avatar: "/lfg/avatars/avatar-5.jpg",
    email: "lagswitch@mail.com",
    region: "SG2",
    joinedAt: ago(110 * DAY),
    lastActiveAt: ago(5 * DAY),
    reputation: 2.2,
    reviewCount: 18,
    mainGame: "Valorant",
  },
];

const seedLobbies: AdminLobby[] = [
  {
    id: "lobby-3",
    name: "WOKDETOK",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-2.jpg",
    mode: "ranked",
    status: "live",
    region: "SG2",
    leaderId: "ziza",
    memberIds: ["ziza", "wokdetok", "yonziii", "kinoyyy"],
    slotsTotal: 5,
    createdAt: ago(2 * HOUR),
    messages: [
      {
        id: "l3-1",
        authorId: "system",
        authorName: "System",
        body: "Lobby created by Ziza",
        sentAt: "19:02",
        isSystem: true,
      },
      {
        id: "l3-2",
        authorId: "ziza",
        authorName: "Ziza",
        avatar: "/lfg/avatars/avatar-7.jpg",
        body: "controller main here, lets keep comms clean",
        sentAt: "19:04",
      },
      {
        id: "l3-3",
        authorId: "system",
        authorName: "System",
        body: "Lobby started — good luck!",
        sentAt: "19:10",
        isSystem: true,
      },
      {
        id: "l3-4",
        authorId: "kinoyyy",
        authorName: "Kinoyyy",
        avatar: "/lfg/avatars/avatar-2.jpg",
        body: "nt nt, next round we play B",
        sentAt: "19:31",
      },
      {
        id: "l3-5",
        authorId: "wokdetok",
        authorName: "Wokdetok",
        avatar: "/lfg/avatars/avatar-6.jpg",
        body: "B again?? you're all actually useless",
        sentAt: "19:32",
      },
      {
        id: "l3-6",
        authorId: "wokdetok",
        authorName: "Wokdetok",
        avatar: "/lfg/avatars/avatar-6.jpg",
        body: "kinoyyy uninstall, you're the reason we lose every game",
        sentAt: "19:34",
      },
      {
        id: "l3-7",
        authorId: "ziza",
        authorName: "Ziza",
        avatar: "/lfg/avatars/avatar-7.jpg",
        body: "chill, it's one round",
        sentAt: "19:34",
      },
      {
        id: "l3-8",
        authorId: "wokdetok",
        authorName: "Wokdetok",
        avatar: "/lfg/avatars/avatar-6.jpg",
        body: "not playing another round with bots like you",
        sentAt: "19:36",
      },
    ],
  },
  {
    id: activeLobby.id,
    name: activeLobby.name,
    game: activeLobby.game,
    cover: activeLobby.cover,
    mode: activeLobby.mode,
    status: activeLobby.status,
    region: activeLobby.region,
    leaderId: "yonziii",
    memberIds: ["yonziii", "kinoyyy", "ziza"],
    slotsTotal: activeLobby.slotsTotal,
    createdAt: ago(55 * MINUTE),
    messages: activeLobby.messages.map((message) => ({
      ...message,
      authorId:
        message.authorId === "system"
          ? "system"
          : message.authorName.toLowerCase(),
    })),
  },
  {
    id: "lobby-4",
    name: "KINOYYY",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-4.jpg",
    mode: "casual",
    status: "live",
    region: "SG2",
    leaderId: "tenz",
    memberIds: ["tenz", "nyawit"],
    slotsTotal: 5,
    createdAt: ago(3 * HOUR),
    messages: [
      {
        id: "l4-1",
        authorId: "system",
        authorName: "System",
        body: "Lobby created by Tenz",
        sentAt: "18:15",
        isSystem: true,
      },
      {
        id: "l4-2",
        authorId: "tenz",
        authorName: "Tenz",
        avatar: "/lfg/avatars/avatar-4.jpg",
        body: "casual only, no sweating pls",
        sentAt: "18:16",
      },
    ],
  },
  {
    id: "lobby-2",
    name: "NYAWIT.COM",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-3.jpg",
    mode: "tournament",
    status: "forming",
    region: "SG2",
    leaderId: "threshcan",
    memberIds: ["threshcan", "kinoyyy"],
    slotsTotal: 5,
    createdAt: ago(6 * HOUR),
    messages: [],
  },
  {
    id: "lobby-7",
    name: "Chill Unrated Night",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-4.jpg",
    mode: "casual",
    status: "completed",
    region: "SG2",
    leaderId: "tenz",
    memberIds: ["tenz", "noscopegod", "shadowstrike"],
    slotsTotal: 5,
    createdAt: ago(1 * DAY),
    messages: [
      {
        id: "l7-1",
        authorId: "system",
        authorName: "System",
        body: "Lobby created by Tenz",
        sentAt: "21:00",
        isSystem: true,
      },
      {
        id: "l7-2",
        authorId: "noscopegod",
        authorName: "NoScopeGod",
        avatar: "/lfg/avatars/avatar-4.jpg",
        body: "tenz how are you hitting those shots through smoke",
        sentAt: "21:40",
      },
      {
        id: "l7-3",
        authorId: "tenz",
        authorName: "Tenz",
        avatar: "/lfg/avatars/avatar-4.jpg",
        body: "sound cues, they were running",
        sentAt: "21:41",
      },
      {
        id: "l7-4",
        authorId: "shadowstrike",
        authorName: "ShadowStrike",
        avatar: "/lfg/avatars/avatar-2.jpg",
        body: "noscope stop crying and play",
        sentAt: "21:42",
      },
      {
        id: "l7-5",
        authorId: "system",
        authorName: "System",
        body: "Lobby ended by the leader",
        sentAt: "22:30",
        isSystem: true,
      },
    ],
  },
  {
    id: "lobby-5",
    name: "Shadow Stalkers",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-1.jpg",
    mode: "ranked",
    status: "completed",
    region: "SG2",
    leaderId: "yonziii",
    memberIds: ["yonziii", "wokdetok", "noscopegod"],
    slotsTotal: 5,
    createdAt: ago(2 * DAY + 3 * HOUR),
    messages: [
      {
        id: "l5-1",
        authorId: "system",
        authorName: "System",
        body: "Lobby started — good luck!",
        sentAt: "20:10",
        isSystem: true,
      },
      {
        id: "l5-2",
        authorId: "yonziii",
        authorName: "Yonziii",
        avatar: "/lfg/avatars/avatar-1.jpg",
        body: "wokdetok you there? you haven't moved since round 3",
        sentAt: "20:38",
      },
      {
        id: "l5-3",
        authorId: "noscopegod",
        authorName: "NoScopeGod",
        avatar: "/lfg/avatars/avatar-4.jpg",
        body: "yonziii your calls are throwing this game",
        sentAt: "20:41",
      },
      {
        id: "l5-4",
        authorId: "system",
        authorName: "System",
        body: "Lobby ended by the leader",
        sentAt: "21:05",
        isSystem: true,
      },
    ],
  },
  {
    id: "lobby-6",
    name: "RADIANT OR BUST",
    game: "valorant",
    cover: "/lfg/covers/valorant-cover-3.jpg",
    mode: "ranked",
    status: "closed",
    region: "SG2",
    leaderId: "lagswitch",
    memberIds: ["lagswitch", "carrypotter"],
    slotsTotal: 5,
    createdAt: ago(6 * DAY),
    closedAt: ago(5 * DAY),
    closedBy: "adm-1",
    closedReason:
      "Lobby bio advertised a paid aim-assist tool. Closed alongside the leader's ban.",
    messages: [
      {
        id: "l6-1",
        authorId: "lagswitch",
        authorName: "LagSwitch",
        avatar: "/lfg/avatars/avatar-5.jpg",
        body: "DM me for the tool, guaranteed radiant in a week",
        sentAt: "13:20",
      },
    ],
  },
];

const seedReports: AdminReport[] = [
  {
    id: "rpt-1012",
    status: "open",
    reason: "Flaming / verbal provocation",
    details:
      "Kept insulting the team in chat after every lost round and told Kinoyyy to uninstall. Nobody provoked him first.",
    evidenceFileName: "round-8-chat.png",
    reporterId: "ziza",
    targetId: "wokdetok",
    source: "lobby",
    lobbyId: "lobby-3",
    createdAt: ago(40 * MINUTE),
  },
  {
    id: "rpt-1011",
    status: "open",
    reason: "Verbal abuse or harassment",
    details:
      "Targeted me personally in text and voice for the rest of the match, calling me a bot and blaming me for every round.",
    evidenceFileName: "voice-clip-round-9.mp4",
    reporterId: "kinoyyy",
    targetId: "wokdetok",
    source: "lobby",
    lobbyId: "lobby-3",
    createdAt: ago(35 * MINUTE),
  },
  {
    id: "rpt-1010",
    status: "open",
    reason: "Verbal abuse or harassment",
    details: "Told me to stop crying in front of everyone. Very toxic.",
    reporterId: "noscopegod",
    targetId: "shadowstrike",
    source: "lobby",
    lobbyId: "lobby-7",
    createdAt: ago(20 * HOUR),
  },
  {
    id: "rpt-1009",
    status: "open",
    reason: "AFK / left the game",
    details:
      "Stopped moving from round 3 onward and didn't respond in chat or voice. We played 4v5 for the rest of the match.",
    reporterId: "yonziii",
    targetId: "wokdetok",
    source: "match",
    lobbyId: "lobby-5",
    createdAt: ago(2 * DAY),
  },
  {
    id: "rpt-1008",
    status: "in_review",
    reason: "Cheating / third-party software",
    details:
      "Hit multiple headshots through smoke with no information. Looks like wallhacks to me.",
    reporterId: "noscopegod",
    targetId: "tenz",
    source: "lobby",
    lobbyId: "lobby-7",
    createdAt: ago(22 * HOUR),
    assignedTo: "adm-2",
  },
  {
    id: "rpt-1007",
    status: "open",
    reason: "Inappropriate profile content",
    details:
      "Their profile bio links to a boosting service and asks people to DM for prices.",
    reporterId: "threshcan",
    targetId: "nyawit",
    source: "profile",
    createdAt: ago(3 * HOUR),
  },
  {
    id: "rpt-1006",
    status: "dismissed",
    reason: "Trolling / intentional sabotage",
    details: "The leader made terrible calls on purpose so we would lose.",
    reporterId: "noscopegod",
    targetId: "yonziii",
    source: "lobby",
    lobbyId: "lobby-5",
    createdAt: ago(2 * DAY),
    resolution: {
      outcome: "dismissed",
      note: "Chat shows normal shot-calling and no sabotage. Disagreeing with strategy isn't trolling.",
      resolvedBy: "adm-1",
      resolvedAt: ago(1 * DAY + 20 * HOUR),
    },
  },
  {
    id: "rpt-1005",
    status: "resolved",
    reason: "Cheating / third-party software",
    details:
      "Their lobby bio is selling an aim-assist tool and they asked me to DM them to buy it.",
    evidenceFileName: "lobby-bio-screenshot.png",
    reporterId: "shadowstrike",
    targetId: "lagswitch",
    source: "profile",
    lobbyId: "lobby-6",
    createdAt: ago(6 * DAY),
    resolution: {
      outcome: "sanctioned",
      sanctionId: "san-4",
      note: "Advertising cheats after a previous suspension for cheating. Escalated to permanent ban.",
      resolvedBy: "adm-1",
      resolvedAt: ago(5 * DAY),
    },
  },
  {
    id: "rpt-1004",
    status: "resolved",
    reason: "Flaming / verbal provocation",
    details: "Flamed the whole team after we lost pistol round.",
    reporterId: "threshcan",
    targetId: "wokdetok",
    source: "match",
    createdAt: ago(21 * DAY),
    resolution: {
      outcome: "sanctioned",
      sanctionId: "san-2",
      note: "First offence, clear in chat log. Warning issued.",
      resolvedBy: "adm-2",
      resolvedAt: ago(20 * DAY),
    },
  },
  {
    id: "rpt-1003",
    status: "dismissed",
    reason: "Other",
    details: "Refused to play duelist when I asked.",
    reporterId: "noscopegod",
    targetId: "kinoyyy",
    source: "match",
    createdAt: ago(30 * DAY),
    resolution: {
      outcome: "dismissed",
      note: "No rule broken. Players pick their own role.",
      resolvedBy: "adm-2",
      resolvedAt: ago(29 * DAY),
    },
  },
  {
    id: "rpt-1002",
    status: "resolved",
    reason: "AFK / left the game",
    details: "Left after the first half without saying anything.",
    reporterId: "nyawit",
    targetId: "threshcan",
    source: "match",
    createdAt: ago(45 * DAY),
    resolution: {
      outcome: "sanctioned",
      sanctionId: "san-1",
      note: "Confirmed by match data. First offence.",
      resolvedBy: "adm-1",
      resolvedAt: ago(44 * DAY),
    },
  },
  {
    id: "rpt-1001",
    status: "resolved",
    reason: "Cheating / third-party software",
    details: "Instant flicks onto players behind walls, every round.",
    evidenceFileName: "killcam-compilation.mp4",
    reporterId: "kinoyyy",
    targetId: "lagswitch",
    source: "match",
    createdAt: ago(40 * DAY),
    resolution: {
      outcome: "sanctioned",
      sanctionId: "san-3",
      note: "Clip is conclusive. 7-day suspension; any repeat goes to a ban.",
      resolvedBy: "adm-1",
      resolvedAt: ago(39 * DAY),
    },
  },
];

const seedSanctions: Sanction[] = [
  {
    id: "san-5",
    playerId: "carrypotter",
    type: "suspension",
    durationDays: 3,
    reason: "Inappropriate profile content",
    note: "Offensive profile picture, spotted while reviewing another case. Issued directly from the player record.",
    reportIds: [],
    issuedBy: "adm-2",
    issuedAt: ago(1 * DAY),
    expiresAt: fromNow(2 * DAY),
  },
  {
    id: "san-4",
    playerId: "lagswitch",
    type: "ban",
    reason: "Cheating / third-party software",
    note: "Advertising cheats after a previous suspension for cheating.",
    reportIds: ["rpt-1005"],
    issuedBy: "adm-1",
    issuedAt: ago(5 * DAY),
  },
  {
    id: "san-3",
    playerId: "lagswitch",
    type: "suspension",
    durationDays: 7,
    reason: "Cheating / third-party software",
    note: "Clip is conclusive.",
    reportIds: ["rpt-1001"],
    issuedBy: "adm-1",
    issuedAt: ago(39 * DAY),
    expiresAt: ago(32 * DAY),
  },
  {
    id: "san-2",
    playerId: "wokdetok",
    type: "warning",
    reason: "Flaming / verbal provocation",
    note: "First offence, clear in chat log.",
    reportIds: ["rpt-1004"],
    issuedBy: "adm-2",
    issuedAt: ago(20 * DAY),
  },
  {
    id: "san-1",
    playerId: "threshcan",
    type: "warning",
    reason: "AFK / left the game",
    note: "Confirmed by match data. First offence.",
    reportIds: ["rpt-1002"],
    issuedBy: "adm-1",
    issuedAt: ago(44 * DAY),
  },
];

const seedActions: AdminAction[] = [
  {
    id: "act-9",
    adminId: "adm-2",
    type: "report_claimed",
    targetType: "report",
    targetId: "rpt-1008",
    summary: "Claimed report",
    reason: "Reviewing match footage before deciding.",
    at: ago(21 * HOUR),
  },
  {
    id: "act-8",
    adminId: "adm-1",
    type: "report_dismissed",
    targetType: "report",
    targetId: "rpt-1006",
    summary: "Dismissed report",
    reason:
      "Chat shows normal shot-calling and no sabotage. Disagreeing with strategy isn't trolling.",
    at: ago(1 * DAY + 20 * HOUR),
  },
  {
    id: "act-7",
    adminId: "adm-2",
    type: "sanction_issued",
    targetType: "player",
    targetId: "carrypotter",
    summary: "3-day suspension",
    reason: "Offensive profile picture.",
    at: ago(1 * DAY),
  },
  {
    id: "act-6",
    adminId: "adm-1",
    type: "lobby_closed",
    targetType: "lobby",
    targetId: "lobby-6",
    summary: "Closed lobby",
    reason:
      "Lobby bio advertised a paid aim-assist tool. Closed alongside the leader's ban.",
    at: ago(5 * DAY),
  },
  {
    id: "act-5",
    adminId: "adm-1",
    type: "sanction_issued",
    targetType: "player",
    targetId: "lagswitch",
    summary: "Permanent ban",
    reason: "Advertising cheats after a previous suspension for cheating.",
    at: ago(5 * DAY),
  },
  {
    id: "act-4",
    adminId: "adm-2",
    type: "sanction_issued",
    targetType: "player",
    targetId: "wokdetok",
    summary: "Warning",
    reason: "First offence, clear in chat log.",
    at: ago(20 * DAY),
  },
  {
    id: "act-3",
    adminId: "adm-2",
    type: "report_dismissed",
    targetType: "report",
    targetId: "rpt-1003",
    summary: "Dismissed report",
    reason: "No rule broken. Players pick their own role.",
    at: ago(29 * DAY),
  },
  {
    id: "act-2",
    adminId: "adm-1",
    type: "sanction_issued",
    targetType: "player",
    targetId: "threshcan",
    summary: "Warning",
    reason: "Confirmed by match data. First offence.",
    at: ago(44 * DAY),
  },
  {
    id: "act-1",
    adminId: "adm-1",
    type: "sanction_issued",
    targetType: "player",
    targetId: "lagswitch",
    summary: "7-day suspension",
    reason: "Clip is conclusive.",
    at: ago(39 * DAY),
  },
];

export function createSeedAdminData(): AdminData {
  return {
    players: seedPlayers,
    reports: seedReports,
    sanctions: seedSanctions,
    lobbies: seedLobbies,
    actions: seedActions,
  };
}
