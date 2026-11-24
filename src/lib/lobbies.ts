import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LfgMode, LfgTeam } from "@/data/lfg-teams";
import { coverSrc } from "@/data/lfg-covers";
import { rankIconFor } from "@/data/rank-icons";
import { roleIconFor } from "@/data/role-icons";
import { avatarUrl } from "@/lib/avatar";
import type { GameInfo } from "@/lib/games";
import { isNewPlayer } from "@/lib/reputation";
import { playstyleScore, reputationScore, tagScore, totalScore } from "@/lib/recommendation";
import { fetchTagCatalog, fetchTagStrengths } from "@/lib/tags";

/**
 * Lobbies, applications and the functions that change them
 * (20261006000000_lobbies.sql). Reads are plain selects; every write is a
 * database function, because that is where the rank, capacity and
 * "one live lobby" rules are enforced.
 */

/** Wording for the stable error codes the database functions raise. */
const lobbyErrors: Record<string, string> = {
  not_signed_in: "Log in to continue.",
  game_or_mode_invalid: "That game mode isn't available.",
  name_invalid: "Give your lobby a name of 3 to 40 characters.",
  capacity_invalid: "That group size isn't allowed for this mode.",
  rank_range_invalid: "The lowest rank can't be above the highest.",
  schedule_invalid: "Pick a start time that hasn't passed yet.",
  already_in_live_lobby: "You're already in a live lobby. Leave or close it first.",
  lobby_not_found: "That lobby no longer exists.",
  lobby_closed: "This lobby has closed.",
  lobby_started: "This lobby has already started.",
  member_busy: "Someone in this lobby is already in another live lobby.",
  not_started: "This lobby hasn't started yet.",
  voice_link_invalid: "Use a Discord invite link, like https://discord.gg/yourcode.",
  own_lobby: "This is your own lobby.",
  lobby_full: "This lobby is full.",
  role_invalid: "That role isn't valid for this game.",
  already_applied: "You've already applied to this lobby.",
  application_declined: "The leader declined your earlier application.",
  rank_not_eligible: "Your rank doesn't fit this lobby right now.",
  not_leader: "Only the lobby leader can do that.",
  // Invite codes come before `not_pending`: the lookup is by substring, and
  // `invite_not_pending` contains it.
  invite_not_found: "That invitation no longer exists.",
  invite_not_pending: "That invitation was already answered or taken back.",
  player_not_found: "That player doesn't exist.",
  already_member: "They're already in this lobby.",
  invitee_applied: "They already asked to join. Accept their application instead.",
  no_invite_slots:
    "You've sent as many invitations as this lobby can use right now (two per open slot).",
  already_invited: "You've already invited this player.",
  invite_declined: "They declined your invitation to this lobby.",
  invite_rate_limited: "You've sent a lot of invitations. Try again later.",
  not_pending: "That application was already decided.",
  applicant_busy: "That player is already in another live lobby.",
  not_in_lobby: "You're not in that lobby.",
};

export function lobbyErrorMessage(
  error: { message?: string } | null | undefined,
): string {
  const text = error?.message ?? "";
  const code = Object.keys(lobbyErrors).find((key) => text.includes(key));
  return code ? lobbyErrors[code] : "Something went wrong. Try again.";
}

export interface CreateLobbyInput {
  game: GameInfo;
  modeId: number;
  name: string;
  description: string;
  /** A region code ("AP"), not its label. */
  region: string;
  languages: string[];
  micRequired: boolean;
  tags: string[];
  capacity: number;
  /** ISO timestamps; a null start means "live now". */
  startsAt: string | null;
  endsAt: string | null;
  minRankId: number | null;
  maxRankId: number | null;
  cover: string | null;
  roleIds: number[];
  /** Optional Discord invite; only the leader and members can ever see it. */
  discordUrl: string;
  /** Pb in Persamaan 3.2 — the lobby's own playstyle, not the leader's. */
  playstyle: number | null;
  /** Set B in Persamaan 3.14, at most three. */
  wantedTagIds: number[];
}

export async function createLobby(
  supabase: SupabaseClient,
  input: CreateLobbyInput,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase.rpc("create_lobby", {
    p_game_id: input.game.id,
    p_mode_id: input.modeId,
    p_name: input.name,
    p_description: input.description.trim() || null,
    p_region: input.region,
    p_languages: input.languages,
    p_mic_required: input.micRequired,
    p_tags: input.tags,
    p_capacity: input.capacity,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_min_rank_id: input.minRankId,
    p_max_rank_id: input.maxRankId,
    p_cover: input.cover,
    p_role_ids: input.roleIds,
    p_discord_url: input.discordUrl.trim() || null,
  });
  if (error || !data) return { error: lobbyErrorMessage(error) };

  const id = data as string;
  // A second call rather than more parameters on create_lobby: that function
  // is 106 lines and changing its signature means rewriting it whole, with no
  // way to test the result before it reaches the database. See
  // 20261116000400_lobby_preferences.sql.
  //
  // A failure here leaves the lobby without preferences, which is a legal
  // state — |B| = 0 falls back to Persamaan 3.15 and playstyle may be null —
  // so the lobby is still returned and the leader can set them from Edit.
  await setLobbyPreferences(supabase, id, input.playstyle, input.wantedTagIds);
  return { id };
}

/**
 * The lobby's own playstyle and the tags it looks for: the two inputs the
 * recommendation formula reads from a lobby rather than from a player.
 */
export async function setLobbyPreferences(
  supabase: SupabaseClient,
  lobbyId: string,
  playstyle: number | null,
  wantedTagIds: number[],
): Promise<string | null> {
  const { error } = await supabase.rpc("set_lobby_preferences", {
    p_lobby: lobbyId,
    p_playstyle: playstyle,
    p_tag_ids: wantedTagIds.length > 0 ? wantedTagIds : null,
  });
  return error ? lobbyErrorMessage(error) : null;
}

/** Real lobbies have uuid ids; the mock ones in src/data are "lobby-1" and so on. */
export function isLobbyId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Same codes, worded for the leader deciding on someone else's application. */
function leaderErrorMessage(error: { message?: string } | null | undefined): string {
  const text = error?.message ?? "";
  if (text.includes("rank_not_eligible")) {
    return "This player no longer fits the lobby now that others have joined.";
  }
  if (text.includes("applicant_busy")) {
    return "This player is already in another live lobby.";
  }
  return lobbyErrorMessage(error);
}

/** Returns an error message, or null when the application was sent. */
export async function applyToLobby(
  supabase: SupabaseClient,
  lobbyId: string,
  roleId: number | null,
  message: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("apply_to_lobby", {
    p_lobby_id: lobbyId,
    p_role_id: roleId,
    p_message: message.trim() || null,
  });
  return error ? lobbyErrorMessage(error) : null;
}

const jakartaDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(date);

/** "Today 8:00 PM", "Tomorrow 8:00 PM" or "Fri 8:00 PM", in UTC+7 like the form. */
export function startLabel(iso: string): string {
  const start = new Date(iso);
  const now = new Date();
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
  if (jakartaDay(start) === jakartaDay(now)) return `Today ${time}`;
  if (jakartaDay(start) === jakartaDay(new Date(now.getTime() + 86_400_000))) {
    return `Tomorrow ${time}`;
  }
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  }).format(start);
  return `${day} ${time}`;
}

type LobbyStatus = "open" | "in_progress" | "scheduled" | "completed" | "cancelled";

interface PersonRow {
  id: string;
  username: string;
  avatar_path: string | null;
  playstyle: number | null;
  /** R* in stars (Persamaan 3.10); 3 for someone nobody has rated. */
  reputation_bayes: number | string;
  /** The plain average players see (Persamaan 3.12). */
  reputation_score: number | string;
  review_count: number;
  /** Computed columns (20261118000200_reputation_display.sql). */
  rater_count: number;
  is_suspended: boolean;
  user_game_mapping: { game_id: number; rank_id: number | null }[];
}

interface ApplicationRow {
  applicant_id: string;
  status: string;
  decided_at: string | null;
  applicant: PersonRow | null;
}

interface LobbyRow {
  id: string;
  leader_id: string;
  mode_id: number;
  name: string;
  description: string | null;
  region: string;
  languages: string[];
  mic_required: boolean;
  tags: string[];
  capacity: number;
  status: LobbyStatus;
  starts_at: string | null;
  ends_at: string | null;
  started_at: string | null;
  min_rank_id: number | null;
  max_rank_id: number | null;
  cover: string | null;
  playstyle: number | null;
  lobby_required_role: { role_id: number }[];
  lobby_tag: { tag_id: number; tag: { name: string } | null }[];
  leader: PersonRow | null;
  applications: ApplicationRow[];
}

const PERSON =
  "id, username, avatar_path, playstyle, reputation_bayes, reputation_score, review_count, rater_count, is_suspended, user_game_mapping(game_id, rank_id)";

/**
 * A lobby with everything a card needs in one request: its roles, its leader
 * and the applications the viewer may see (the roster is public; pending
 * ones reach only the applicant and the leader), each with the person's
 * profile and rank.
 */
/**
 * Pending invitations a leader may have out per open slot. An invite doesn't
 * hold a slot, so a leader can ask more players than they need; the first to
 * accept gets it. Same number as `invite_to_lobby`
 * (20261123000200_invites_no_slot.sql).
 */
export const INVITES_PER_OPEN_SLOT = 2;

const LOBBY_SELECT = `id, leader_id, mode_id, name, description, region, languages, mic_required, tags, capacity, status, starts_at, ends_at, started_at, min_rank_id, max_rank_id, cover, playstyle, lobby_required_role(role_id), lobby_tag(tag_id, tag(name)), leader:profiles!lobbies_leader_id_fkey(${PERSON}), applications(applicant_id, status, decided_at, applicant:profiles!applications_applicant_id_fkey(${PERSON}))`;

/**
 * Ends lobbies whose leader forgot them. Runs once per server request however
 * many lists ask for it, so a page showing two lists doesn't pay for it twice.
 */
const expireStaleLobbies = cache(async (supabase: SupabaseClient) => {
  await supabase.rpc("expire_stale_lobbies");
});

/** The roster in the order it should show: the leader, then members by join time. */
function rosterOf(leader: PersonRow | null, applications: ApplicationRow[]): PersonRow[] {
  const joined = applications
    .filter((application) => application.status === "accepted")
    .sort((a, b) => (a.decided_at ?? "").localeCompare(b.decided_at ?? ""))
    .flatMap((application) => (application.applicant ? [application.applicant] : []));
  return leader ? [leader, ...joined] : joined;
}

function toTeam(row: LobbyRow, game: GameInfo, viewerId?: string | null): LfgTeam {
  const rankOf = (person: PersonRow | null) => {
    const rankId = person?.user_game_mapping.find((entry) => entry.game_id === game.id)?.rank_id;
    return game.ranks.find((rank) => rank.id === rankId);
  };
  const people = rosterOf(row.leader, row.applications);
  const mode = game.modes.find((candidate) => candidate.id === row.mode_id);
  const leaderRank = rankOf(row.leader);
  const minRank = game.ranks.find((rank) => rank.id === row.min_rank_id);
  const maxRank = game.ranks.find((rank) => rank.id === row.max_rank_id);
  const ownStatus = row.applications.find(
    (application) => application.applicant_id === viewerId,
  )?.status;

  const viewerState: LfgTeam["viewerState"] = !viewerId
    ? undefined
    : row.leader_id === viewerId
      ? "leader"
      : people.some((person) => person.id === viewerId)
        ? "member"
        : ownStatus === "pending" || ownStatus === "declined"
          ? ownStatus
          : undefined;

  return {
    id: row.id,
    name: row.name,
    game: game.slug,
    cover: coverSrc(game.slug, row.cover),
    mode: mode?.kind ?? "casual",
    modeLabel: mode?.label,
    modeValue: mode?.value,
    modeId: row.mode_id,
    tags: row.tags,
    playstyle: row.playstyle,
    leaderPlaystyle: row.leader?.playstyle ?? null,
    memberReputations: people.map((person) => Number(person.reputation_bayes)),
    wantedTagIds: row.lobby_tag.map((entry) => entry.tag_id),
    wantedTags: row.lobby_tag.flatMap((entry) => (entry.tag ? [entry.tag.name] : [])),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    startedAt: row.started_at,
    closed: row.status === "cancelled" || row.status === "completed",
    completed: row.status === "completed",
    started: row.status === "in_progress",
    viewerState,
    status: statusOf(row),
    region: row.region,
    languages: row.languages.length > 0 ? row.languages.join(" / ") : undefined,
    micRequired: row.mic_required,
    bio: row.description ?? undefined,
    members: people.map((person) => ({
      id: person.id,
      name: person.username,
      avatar: avatarUrl(person.avatar_path),
      rating: person.review_count > 0 ? Number(person.reputation_score) : null,
      isNew: isNewPlayer(person.rater_count),
    })),
    leaderSuspended: Boolean(row.leader?.is_suspended),
    slotsFilled: people.length,
    slotsTotal: row.capacity,
    leaderId: row.leader_id,
    leaderName: row.leader?.username ?? "Unknown",
    rank: leaderRank
      ? {
          name: leaderRank.name,
          icon: rankIconFor(game.slug, leaderRank) ?? "",
          colorClass: "text-white/90",
        }
      : { name: "Unranked", icon: "", colorClass: "text-text-muted" },
    memberOrdinals: people
      .map((person) => rankOf(person)?.ordinal)
      .filter((ordinal): ordinal is number => ordinal !== undefined),
    rankRange:
      minRank || maxRank
        ? { from: minRank?.tier ?? "", to: maxRank?.tier ?? "" }
        : undefined,
    lookingFor: row.lobby_required_role
      .map((entry) => game.roles.find((role) => role.id === entry.role_id))
      .filter((role): role is NonNullable<typeof role> => role !== undefined)
      .map((role) => ({
        name: role.name,
        icon: roleIconFor(game.slug, role.name) ?? "",
      })),
  };
}

function statusOf(row: Pick<LobbyRow, "status" | "starts_at">): LfgTeam["status"] {
  switch (row.status) {
    case "completed":
      return { label: "Ended", isLive: false };
    case "cancelled":
      return { label: "Closed", isLive: false };
    case "in_progress":
      return { label: "In progress", isLive: true };
    default:
      return row.status === "open" || !row.starts_at
        ? { label: "Active Now", isLive: true }
        : { label: startLabel(row.starts_at), isLive: false };
  }
}

/**
 * The open lobbies of one game, shaped like the cards and dialogs expect
 * (`LfgTeam`), newest first. With `lobbyId`, that one lobby in any status, so
 * a closed one can still be opened.
 */
export async function fetchLobbyTeams(
  supabase: SupabaseClient,
  game: GameInfo,
  options: { viewerId?: string | null; lobbyId?: string } = {},
): Promise<LfgTeam[]> {
  return (await queryLobbyTeams(supabase, game, options)).teams;
}

/**
 * Like `fetchLobbyTeams`, but says whether the read failed, so the LFG list
 * can show "Couldn't load lobbies" instead of an empty list that looks like
 * nobody is playing.
 */
export async function queryLobbyTeams(
  supabase: SupabaseClient,
  game: GameInfo,
  options: { viewerId?: string | null; lobbyId?: string } = {},
): Promise<{ teams: LfgTeam[]; failed: boolean }> {
  const { viewerId, lobbyId } = options;
  await expireStaleLobbies(supabase);

  const query = supabase.from("lobby").select(LOBBY_SELECT).eq("game_id", game.id);
  const { data, error } = await (lobbyId
    ? query.eq("id", lobbyId)
    : query
        .in("status", ["open", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(60));

  return {
    teams: ((data ?? []) as unknown as LobbyRow[]).map((row) => toTeam(row, game, viewerId)),
    failed: Boolean(error),
  };
}

export async function respondToApplication(
  supabase: SupabaseClient,
  applicationId: string,
  accept: boolean,
): Promise<string | null> {
  const { error } = await supabase.rpc("respond_to_application", {
    p_application_id: applicationId,
    p_accept: accept,
  });
  return error ? leaderErrorMessage(error) : null;
}

/** The leader asks a player to join. Returns an error message, or null when sent. */
/**
 * The lobby a player can invite friends into from Social: one they lead that
 * is still recruiting. The live one first, else the soonest scheduled one.
 */
export async function fetchMyInvitingLobby(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string; name: string } | null> {
  const { data } = await supabase
    .from("lobby")
    .select("id, name, status, starts_at")
    .eq("leader_id", userId)
    .in("status", ["open", "scheduled"]);
  const rows = (data ?? []) as { id: string; name: string; status: string; starts_at: string | null }[];
  const pick =
    rows.find((row) => row.status === "open") ??
    rows
      .filter((row) => row.status === "scheduled")
      .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""))[0];
  return pick ? { id: pick.id, name: pick.name } : null;
}

/**
 * Who already has a pending invitation to the lobby the player would invite
 * friends to (`fetchMyInvitingLobby`), so every invite button for them can
 * show "Invited" instead of offering a second one. RLS lets the leader read
 * the invites they sent. Empty when they lead no such lobby.
 */
export async function fetchMyPendingInvitees(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const lobby = await fetchMyInvitingLobby(supabase, userId);
  if (!lobby) return new Set();
  const { data } = await supabase
    .from("lobby_invites")
    .select("invitee_id")
    .eq("lobby_id", lobby.id)
    .eq("status", "pending");
  return new Set(((data ?? []) as { invitee_id: string }[]).map((row) => row.invitee_id));
}

export async function inviteToLobby(
  supabase: SupabaseClient,
  lobbyId: string,
  userId: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("invite_to_lobby", {
    p_lobby_id: lobbyId,
    p_user_id: userId,
  });
  if (error?.message?.includes("rank_not_eligible")) {
    return "This player's rank doesn't fit the lobby right now.";
  }
  return error ? leaderErrorMessage(error) : null;
}

/** The invited player accepts (and joins the roster) or declines. */
export async function respondToInvite(
  supabase: SupabaseClient,
  inviteId: string,
  accept: boolean,
): Promise<string | null> {
  const { error } = await supabase.rpc("respond_to_invite", {
    p_invite_id: inviteId,
    p_accept: accept,
  });
  return error ? lobbyErrorMessage(error) : null;
}

/** The leader takes an invitation back before it was answered. */
export async function cancelInvite(
  supabase: SupabaseClient,
  inviteId: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("cancel_invite", { p_invite_id: inviteId });
  return error ? lobbyErrorMessage(error) : null;
}

/** An applicant withdraws, or a joined player leaves. */
export async function leaveLobby(
  supabase: SupabaseClient,
  lobbyId: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("leave_lobby", { p_lobby_id: lobbyId });
  return error ? lobbyErrorMessage(error) : null;
}

/** The leader begins playing: no new members, and the lobby leaves the list. */
export async function startLobby(
  supabase: SupabaseClient,
  lobbyId: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("start_lobby", { p_lobby_id: lobbyId });
  return error ? lobbyErrorMessage(error) : null;
}

/** A started lobby goes back to recruiting (someone left and needs replacing). */
export async function reopenLobby(
  supabase: SupabaseClient,
  lobbyId: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("reopen_lobby", { p_lobby_id: lobbyId });
  return error ? lobbyErrorMessage(error) : null;
}

/** What the edit form sends. Same fields as creating, minus game and mode. */
export interface UpdateLobbyInput {
  lobbyId: string;
  name: string;
  description: string;
  region: string;
  languages: string[];
  micRequired: boolean;
  tags: string[];
  capacity: number;
  startsAt: string | null;
  endsAt: string | null;
  minRankId: number | null;
  maxRankId: number | null;
  roleIds: number[];
  discordUrl: string;
  playstyle: number | null;
  wantedTagIds: number[];
}

export async function updateLobby(
  supabase: SupabaseClient,
  input: UpdateLobbyInput,
): Promise<string | null> {
  const { error } = await supabase.rpc("update_lobby", {
    p_lobby_id: input.lobbyId,
    p_name: input.name,
    p_description: input.description.trim() || null,
    p_region: input.region,
    p_languages: input.languages,
    p_mic_required: input.micRequired,
    p_tags: input.tags,
    p_capacity: input.capacity,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_min_rank_id: input.minRankId,
    p_max_rank_id: input.maxRankId,
    p_role_ids: input.roleIds,
    p_discord_url: input.discordUrl.trim() || null,
  });
  if (error) return lobbyErrorMessage(error);

  return setLobbyPreferences(
    supabase,
    input.lobbyId,
    input.playstyle,
    input.wantedTagIds,
  );
}

/** The leader removes a member. It is recorded like leaving, and they may apply again. */
export async function removeMember(
  supabase: SupabaseClient,
  lobbyId: string,
  userId: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("remove_member", {
    p_lobby_id: lobbyId,
    p_user_id: userId,
  });
  return error ? lobbyErrorMessage(error) : null;
}

export async function closeLobby(
  supabase: SupabaseClient,
  lobbyId: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("close_lobby", { p_lobby_id: lobbyId });
  return error ? lobbyErrorMessage(error) : null;
}

export interface LobbyPerson {
  id: string;
  username: string;
  avatar: string;
  rankName: string;
  rankIcon: string;
  /** The role they joined as; null for the leader and for games without roles. */
  roleName: string | null;
  /** Null until anyone has rated them. */
  reputation: number | null;
  /** Different players who rated them. */
  raterCount: number;
}

export interface LobbyApplicationView extends LobbyPerson {
  applicationId: string;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "left";
  createdAt: string;
  /**
   * S_total for this applicant, worked out for the leader only (the proposal's
   * reciprocal side: R is the applicant's own reputation). Orders the
   * join-request list; never shown.
   */
  score?: number | null;
}

/** An invitation the leader has sent and nobody has answered yet. */
export interface LobbyInviteView extends LobbyPerson {
  inviteId: string;
}

/** An invitation addressed to the viewer. */
export interface MyInvite {
  id: string;
  inviterName: string;
  createdAt: string;
}

export interface LobbyDetailData {
  team: LfgTeam;
  /** The Discord invite, for the leader and members only; null for everyone else. */
  voiceUrl: string | null;
  members: LobbyPerson[];
  /** What the viewer may see: every application for the leader, their own otherwise. */
  applications: LobbyApplicationView[];
  /** Pending invitations, for the leader only; they hold open slots. */
  invites: LobbyInviteView[];
  /** The viewer's own pending invitation to this lobby, if there is one. */
  myInvite: MyInvite | null;
  /** Teammates the viewer can still rate; only once the lobby has ended. */
  ratingQueue: LobbyPerson[];
  /** The viewer played here, but ratings are closed: it ran under 15 minutes. */
  ratingsClosed: boolean;
}

/**
 * One lobby with its roster and applications, for the detail screen. The
 * applications come back already filtered by the database: the leader sees
 * them all, an applicant only their own.
 */
export async function fetchLobbyDetail(
  supabase: SupabaseClient,
  game: GameInfo,
  lobbyId: string,
  viewerId: string | null,
): Promise<LobbyDetailData | null> {
  const [team] = await fetchLobbyTeams(supabase, game, { viewerId, lobbyId });
  if (!team) return null;

  // The link is private: the database answers only for people in the lobby.
  const inLobby = team.viewerState === "leader" || team.viewerState === "member";
  const [voice, applicationResult, inviteResult, matchResult] = await Promise.all([
    viewerId && inLobby
      ? supabase.rpc("lobby_voice_link", { p_lobby_id: lobbyId })
      : Promise.resolve({ data: null }),
    supabase
      .from("applications")
      .select("id, applicant_id, role_id, message, status, created_at")
      .eq("lobby_id", lobbyId)
      .order("created_at", { ascending: true }),
    // The leader's own pending invitations and the ones addressed to the
    // viewer, nobody else's.
    supabase
      .from("lobby_invites")
      .select("id, invitee_id, inviter_id, created_at")
      .eq("lobby_id", lobbyId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    // Who the viewer played with and has not rated yet (20261118000000).
    team.completed && viewerId
      ? supabase.rpc("player_matches", { p_user: viewerId })
      : Promise.resolve({ data: null }),
  ]);
  const voiceUrl = (voice.data as string | null) ?? null;
  const applications = (applicationResult.data ?? []) as Array<{
    id: string;
    applicant_id: string;
    role_id: number | null;
    message: string | null;
    status: LobbyApplicationView["status"];
    created_at: string;
  }>;
  const invites = (inviteResult.data ?? []) as Array<{
    id: string;
    invitee_id: string;
    inviter_id: string;
    created_at: string;
  }>;
  const sentInvites = invites.filter((invite) => invite.inviter_id === viewerId);
  const receivedInvite = invites.find((invite) => invite.invitee_id === viewerId);
  const teammates = (
    (matchResult.data ?? []) as Array<{
      lobby_id: string;
      teammate_id: string;
      rated: boolean | null;
      can_rate: boolean;
    }>
  ).filter((row) => row.lobby_id === lobbyId);
  const rateableIds = teammates.filter((row) => row.can_rate).map((row) => row.teammate_id);

  const userIds = [
    ...new Set([
      ...team.members.map((member) => member.id),
      ...applications.map((application) => application.applicant_id),
      ...sentInvites.map((invite) => invite.invitee_id),
      ...(receivedInvite ? [receivedInvite.inviter_id] : []),
      ...rateableIds,
    ]),
  ];
  // The leader's join requests are ranked (proposal 3.3.1.2), which needs
  // each applicant's playstyle, R* and tag strengths.
  const pendingIds =
    team.viewerState === "leader"
      ? applications.filter((a) => a.status === "pending").map((a) => a.applicant_id)
      : [];
  const [{ data: profileRows }, { data: rankRows }, strengths, tagCatalog] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_path, reputation_score, review_count, rater_count, playstyle, reputation_bayes")
      .in("id", userIds),
    supabase
      .from("user_game_mapping")
      .select("user_id, rank_id")
      .eq("game_id", game.id)
      .in("user_id", userIds),
    pendingIds.length > 0 ? fetchTagStrengths(supabase, pendingIds) : Promise.resolve(null),
    pendingIds.length > 0 ? fetchTagCatalog(supabase) : Promise.resolve(null),
  ]);
  const profiles = new Map(
    (
      (profileRows ?? []) as Array<{
        id: string;
        username: string;
        avatar_path: string | null;
        reputation_score: number | string;
        review_count: number;
        rater_count: number;
        playstyle: number | null;
        reputation_bayes: number | string | null;
      }>
    ).map((profile) => [profile.id, profile]),
  );
  const ranks = new Map(
    ((rankRows ?? []) as Array<{ user_id: string; rank_id: number | null }>).map(
      (row) => [row.user_id, game.ranks.find((rank) => rank.id === row.rank_id)],
    ),
  );
  const roleNameOf = (roleId: number | null) =>
    game.roles.find((role) => role.id === roleId)?.name ?? null;

  const person = (userId: string, roleId: number | null): LobbyPerson => {
    const profile = profiles.get(userId);
    const rank = ranks.get(userId);
    return {
      id: userId,
      username: profile?.username ?? "Unknown",
      avatar: avatarUrl(profile?.avatar_path),
      rankName: rank?.name ?? "Unranked",
      rankIcon: rank ? (rankIconFor(game.slug, rank) ?? "") : "",
      roleName: roleNameOf(roleId),
      reputation:
        profile && profile.review_count > 0 ? Number(profile.reputation_score) : null,
      raterCount: profile?.rater_count ?? 0,
    };
  };

  // Persamaan 3.1 from the leader's side: Pb is the lobby's playstyle, R the
  // applicant's own (not the lobby mean), T their strength in the wanted tags.
  const tagNameOf = new Map((tagCatalog ?? []).map((tag) => [tag.id, tag.name]));
  const wanted = (team.wantedTagIds ?? []).filter((id) => tagNameOf.has(id));
  const lobbyPlaystyle = team.playstyle ?? team.leaderPlaystyle ?? null;
  const applicantScore = (userId: string): number | null => {
    if (!pendingIds.includes(userId)) return null;
    const profile = profiles.get(userId);
    if (!profile || profile.playstyle == null || lobbyPlaystyle == null) return null;
    const P = playstyleScore(profile.playstyle, lobbyPlaystyle);
    const R = reputationScore(Number(profile.reputation_bayes ?? 3));
    const held = new Map(
      [...(strengths?.get(userId) ?? new Map<number, number>())].flatMap(([id, value]) => {
        const name = tagNameOf.get(id);
        return name ? [[name, value] as const] : [];
      }),
    );
    const T =
      wanted.length === 0
        ? null
        : tagScore(
            [...held.keys()],
            wanted.map((id) => tagNameOf.get(id)!),
            (tag) => held.get(tag) ?? 0,
          );
    return totalScore(P, R, T);
  };

  const acceptedRole = new Map(
    applications
      .filter((application) => application.status === "accepted")
      .map((application) => [application.applicant_id, application.role_id]),
  );

  return {
    team,
    voiceUrl,
    members: team.members.map((member) =>
      person(member.id, acceptedRole.get(member.id) ?? null),
    ),
    applications: applications.map((application) => ({
      ...person(application.applicant_id, application.role_id),
      applicationId: application.id,
      message: application.message,
      status: application.status,
      createdAt: application.created_at,
      score: applicantScore(application.applicant_id),
    })),
    invites: sentInvites.map((invite) => ({
      ...person(invite.invitee_id, null),
      inviteId: invite.id,
    })),
    myInvite: receivedInvite
      ? {
          id: receivedInvite.id,
          inviterName: profiles.get(receivedInvite.inviter_id)?.username ?? "The leader",
          createdAt: receivedInvite.created_at,
        }
      : null,
    ratingQueue: rateableIds.map((id) => person(id, null)),
    ratingsClosed:
      rateableIds.length === 0 && teammates.some((row) => row.rated === false),
  };
}

/** A lobby the signed-in player leads or has joined, shaped for the banner. */
export interface MyLobby {
  id: string;
  name: string;
  /** `game.slug`. */
  game: string;
  cover: string;
  mode: LfgMode;
  /** The mode's own name, for the badge. */
  modeLabel?: string;
  /** Recruiting, playing, or waiting for its start time. */
  status: "open" | "in_progress" | "scheduled";
  region: string;
  slotsTotal: number;
  members: { id: string; name?: string; avatar: string }[];
  isLeader: boolean;
  /** Applications waiting for an answer; only counted for a lobby they lead. */
  pendingRequests: number;
  scheduledFor?: string;
}

export interface MyLobbies {
  /** The one live (recruiting or playing) lobby a player can be in. */
  current: MyLobby | null;
  /** Any number of scheduled ones, soonest first. */
  scheduled: MyLobby[];
}

const OPEN_STATUSES = ["open", "in_progress", "scheduled"];
const PLAYING_STATUSES = ["open", "in_progress"];

interface MyLobbyRow {
  id: string;
  leader_id: string;
  name: string;
  region: string;
  capacity: number;
  status: MyLobby["status"];
  starts_at: string | null;
  cover: string | null;
  game: { slug: string } | null;
  game_modes: { kind: LfgMode; label: string } | null;
  leader: { id: string; username: string; avatar_path: string | null } | null;
  applications: {
    applicant_id: string;
    status: string;
    decided_at: string | null;
    applicant: { id: string; username: string; avatar_path: string | null } | null;
  }[];
}

const MY_LOBBY_SELECT =
  "id, leader_id, name, region, capacity, status, starts_at, cover, game(slug), game_modes(kind, label), leader:profiles!lobbies_leader_id_fkey(id, username, avatar_path), applications(applicant_id, status, decided_at, applicant:profiles!applications_applicant_id_fkey(id, username, avatar_path))";

/**
 * Lobbies the player leads, and lobbies they were accepted into. A member is
 * an accepted application, so the second set comes through the applications
 * table.
 */
async function queryMyLobbies<T>(
  supabase: SupabaseClient,
  userId: string,
  select: string,
  statuses: string[],
): Promise<T[]> {
  const [led, joined] = await Promise.all([
    supabase.from("lobby").select(select).eq("leader_id", userId).in("status", statuses),
    supabase
      .from("applications")
      .select(`lobby!inner(${select})`)
      .eq("applicant_id", userId)
      .eq("status", "accepted")
      .in("lobby.status", statuses),
  ]);
  const joinedLobbies = ((joined.data ?? []) as unknown as { lobby: T }[]).map(
    (row) => row.lobby,
  );
  return [...((led.data ?? []) as unknown as T[]), ...joinedLobbies];
}

/** Just enough for the navbar: where "back to my lobby" goes. */
export async function fetchMyCurrentLobby(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string; name: string; game: string } | null> {
  const [lobby] = await queryMyLobbies<{
    id: string;
    name: string;
    game: { slug: string } | null;
  }>(supabase, userId, "id, name, game(slug)", PLAYING_STATUSES);
  return lobby?.game ? { id: lobby.id, name: lobby.name, game: lobby.game.slug } : null;
}

function toMyLobby(row: MyLobbyRow, userId: string): MyLobby {
  const slug = row.game?.slug ?? "";
  const isLeader = row.leader_id === userId;
  const joined = row.applications
    .filter((application) => application.status === "accepted")
    .sort((a, b) => (a.decided_at ?? "").localeCompare(b.decided_at ?? ""))
    .flatMap((application) => (application.applicant ? [application.applicant] : []));
  const people = row.leader ? [row.leader, ...joined] : joined;

  return {
    id: row.id,
    name: row.name,
    game: slug,
    cover: coverSrc(slug, row.cover),
    mode: row.game_modes?.kind ?? "casual",
    modeLabel: row.game_modes?.label,
    status: row.status,
    region: row.region,
    slotsTotal: row.capacity,
    members: people.map((person) => ({
      id: person.id,
      name: person.username,
      avatar: avatarUrl(person.avatar_path),
    })),
    isLeader,
    pendingRequests: isLeader
      ? row.applications.filter((application) => application.status === "pending").length
      : 0,
    scheduledFor:
      row.status === "scheduled" && row.starts_at ? startLabel(row.starts_at) : undefined,
  };
}

/**
 * Every open lobby the player is in, for the "Your lobby" banner. A lobby you
 * applied to but weren't accepted into is not here.
 */
export async function fetchMyLobbies(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyLobbies> {
  await expireStaleLobbies(supabase);
  const rows = await queryMyLobbies<MyLobbyRow>(
    supabase,
    userId,
    MY_LOBBY_SELECT,
    OPEN_STATUSES,
  );

  const lobbies = rows
    .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""))
    .map((row) => toMyLobby(row, userId));

  return {
    current: lobbies.find((lobby) => lobby.status !== "scheduled") ?? null,
    scheduled: lobbies.filter((lobby) => lobby.status === "scheduled"),
  };
}
