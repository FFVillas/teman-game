import type { SupabaseClient } from "@supabase/supabase-js";
import type { LfgMode, LfgTeam } from "@/data/lfg-teams";
import { coverSrc } from "@/data/lfg-covers";
import { rankIconFor } from "@/data/rank-icons";
import { roleIconFor } from "@/data/role-icons";
import { avatarUrl } from "@/lib/avatar";
import type { GameInfo } from "@/lib/games";

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
  no_invite_slots: "Every open slot already has an invitation out.",
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
  return { id: data as string };
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
  status: "live" | "started" | "scheduled" | "completed" | "closed";
  starts_at: string | null;
  ends_at: string | null;
  min_rank_id: number | null;
  max_rank_id: number | null;
  cover: string | null;
}

/**
 * The open lobbies of one game, shaped like the cards and dialogs expect
 * (`LfgTeam`). Newest first. A few small queries rather than one wide join:
 * the lobbies, their rosters and roles, then the people's profiles and ranks.
 */
export async function fetchLobbyTeams(
  supabase: SupabaseClient,
  game: GameInfo,
  options: { viewerId?: string | null; lobbyId?: string } = {},
): Promise<LfgTeam[]> {
  const { viewerId, lobbyId } = options;
  // Lobbies the leader forgot to end drop out as soon as anyone looks.
  await supabase.rpc("expire_stale_lobbies");
  const columns =
    "id, leader_id, mode_id, name, description, region, languages, mic_required, tags, capacity, status, starts_at, ends_at, min_rank_id, max_rank_id, cover";
  // One lobby by id (any status, so a closed one can still be opened), or the
  // game's open lobbies, newest first.
  const { data: lobbies } = lobbyId
    ? await supabase.from("lobbies").select(columns).eq("game_id", game.id).eq("id", lobbyId)
    : await supabase
        .from("lobbies")
        .select(columns)
        .eq("game_id", game.id)
        .in("status", ["live", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(60);

  const rows = (lobbies ?? []) as LobbyRow[];
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);

  const [{ data: roster }, { data: roleRows }, { data: ownApplications }] =
    await Promise.all([
      supabase
        .from("lobby_members")
        .select("lobby_id, user_id, is_leader, joined_at")
        .in("lobby_id", ids),
      supabase.from("lobby_roles").select("lobby_id, role_id").in("lobby_id", ids),
      viewerId
        ? supabase
            .from("applications")
            .select("lobby_id, status")
            .eq("applicant_id", viewerId)
            .in("lobby_id", ids)
        : Promise.resolve({ data: [] as Array<{ lobby_id: string; status: string }> }),
    ]);

  const memberRows = (roster ?? []) as Array<{
    lobby_id: string;
    user_id: string;
    is_leader: boolean;
    joined_at: string | null;
  }>;
  const userIds = [...new Set(memberRows.map((member) => member.user_id))];

  const [{ data: profileRows }, { data: rankRows }] = await Promise.all([
    supabase.from("profiles").select("id, username, avatar_path").in("id", userIds),
    supabase
      .from("user_game_mapping")
      .select("user_id, rank_id")
      .eq("game_id", game.id)
      .in("user_id", userIds),
  ]);

  const profiles = new Map(
    (
      (profileRows ?? []) as Array<{
        id: string;
        username: string;
        avatar_path: string | null;
      }>
    ).map((profile) => [profile.id, profile]),
  );
  const rankOf = new Map(
    ((rankRows ?? []) as Array<{ user_id: string; rank_id: number | null }>).map(
      (row) => [row.user_id, game.ranks.find((rank) => rank.id === row.rank_id)],
    ),
  );

  return rows.map((row): LfgTeam => {
    const mode = game.modes.find((candidate) => candidate.id === row.mode_id);
    const members = memberRows
      .filter((member) => member.lobby_id === row.id)
      .sort(
        (a, b) =>
          Number(b.is_leader) - Number(a.is_leader) ||
          (a.joined_at ?? "").localeCompare(b.joined_at ?? ""),
      );
    const leaderProfile = profiles.get(row.leader_id);
    const leaderRank = rankOf.get(row.leader_id);
    const minRank = game.ranks.find((rank) => rank.id === row.min_rank_id);
    const maxRank = game.ranks.find((rank) => rank.id === row.max_rank_id);
    const roleIds = (roleRows ?? [])
      .filter((entry) => entry.lobby_id === row.id)
      .map((entry) => entry.role_id as number);
    const ownStatus = (ownApplications ?? []).find(
      (entry) => entry.lobby_id === row.id,
    )?.status;
    const viewerState: LfgTeam["viewerState"] = !viewerId
      ? undefined
      : row.leader_id === viewerId
        ? "leader"
        : members.some((member) => member.user_id === viewerId)
          ? "member"
          : ownStatus === "pending"
            ? "pending"
            : ownStatus === "declined"
              ? "declined"
              : undefined;

    return {
      id: row.id,
      name: row.name,
      game: game.slug,
      cover: coverSrc(game.slug, row.cover),
      mode: mode?.kind ?? "casual",
      modeValue: mode?.value,
      modeId: row.mode_id,
      tags: row.tags,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      closed: row.status === "closed" || row.status === "completed",
      completed: row.status === "completed",
      started: row.status === "started",
      viewerState,
      status:
        row.status === "completed"
          ? { label: "Ended", isLive: false }
          : row.status === "closed"
            ? { label: "Closed", isLive: false }
            : row.status === "started"
            ? { label: "In progress", isLive: true }
            : row.status === "live" || !row.starts_at
            ? { label: "Active Now", isLive: true }
            : { label: startLabel(row.starts_at), isLive: false },
      region: row.region,
      languages: row.languages.length > 0 ? row.languages.join(" / ") : undefined,
      micRequired: row.mic_required,
      bio: row.description ?? undefined,
      members: members.map((member) => {
        const profile = profiles.get(member.user_id);
        return {
          id: member.user_id,
          name: profile?.username,
          avatar: avatarUrl(profile?.avatar_path),
        };
      }),
      slotsFilled: members.length,
      slotsTotal: row.capacity,
      leaderId: row.leader_id,
      leaderName: leaderProfile?.username ?? "Unknown",
      rank: leaderRank
        ? {
            name: leaderRank.name,
            icon: rankIconFor(game.slug, leaderRank) ?? "",
            colorClass: "text-white/90",
          }
        : { name: "Unranked", icon: "", colorClass: "text-text-muted" },
      memberOrdinals: members
        .map((member) => rankOf.get(member.user_id)?.ordinal)
        .filter((ordinal): ordinal is number => ordinal !== undefined),
      rankRange:
        minRank || maxRank
          ? { from: minRank?.tier ?? "", to: maxRank?.tier ?? "" }
          : undefined,
      lookingFor: roleIds
        .map((id) => game.roles.find((role) => role.id === id))
        .filter((role): role is NonNullable<typeof role> => role !== undefined)
        .map((role) => ({
          name: role.name,
          icon: roleIconFor(game.slug, role.name) ?? "",
        })),
    };
  });
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
  return error ? lobbyErrorMessage(error) : null;
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
}

export interface LobbyApplicationView extends LobbyPerson {
  applicationId: string;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "left";
  createdAt: string;
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
  let voiceUrl: string | null = null;
  if (viewerId && (team.viewerState === "leader" || team.viewerState === "member")) {
    const { data } = await supabase.rpc("lobby_voice_link", { p_lobby_id: lobbyId });
    voiceUrl = (data as string | null) ?? null;
  }

  const { data: applicationRows } = await supabase
    .from("applications")
    .select("id, applicant_id, role_id, message, status, created_at")
    .eq("lobby_id", lobbyId)
    .order("created_at", { ascending: true });
  const applications = (applicationRows ?? []) as Array<{
    id: string;
    applicant_id: string;
    role_id: number | null;
    message: string | null;
    status: LobbyApplicationView["status"];
    created_at: string;
  }>;

  // Pending invitations: the database returns the leader's own and the ones
  // addressed to the viewer, nobody else's.
  const { data: inviteRows } = await supabase
    .from("lobby_invites")
    .select("id, invitee_id, inviter_id, created_at")
    .eq("lobby_id", lobbyId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const invites = (inviteRows ?? []) as Array<{
    id: string;
    invitee_id: string;
    inviter_id: string;
    created_at: string;
  }>;
  const sentInvites = invites.filter((invite) => invite.inviter_id === viewerId);
  const receivedInvite = invites.find((invite) => invite.invitee_id === viewerId);

  const userIds = [
    ...new Set([
      ...team.members.map((member) => member.id),
      ...applications.map((application) => application.applicant_id),
      ...sentInvites.map((invite) => invite.invitee_id),
      ...(receivedInvite ? [receivedInvite.inviter_id] : []),
    ]),
  ];
  const [{ data: profileRows }, { data: rankRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_path, reputation_score, review_count")
      .in("id", userIds),
    supabase
      .from("user_game_mapping")
      .select("user_id, rank_id")
      .eq("game_id", game.id)
      .in("user_id", userIds),
  ]);
  const profiles = new Map(
    (
      (profileRows ?? []) as Array<{
        id: string;
        username: string;
        avatar_path: string | null;
        reputation_score: number | string;
        review_count: number;
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
    };
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
  };
}

/** A lobby the signed-in player leads or has joined, shaped for the banner. */
export interface MyLobby {
  id: string;
  name: string;
  /** `games.slug`. */
  game: string;
  cover: string;
  mode: LfgMode;
  /** Recruiting, playing, or waiting for its start time. */
  status: "live" | "started" | "scheduled";
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

/** Just enough for the navbar: where "back to my lobby" goes. */
export async function fetchMyCurrentLobby(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string; name: string; game: string } | null> {
  const { data: mine } = await supabase
    .from("lobby_members")
    .select("lobby_id")
    .eq("user_id", userId);
  const ids = (mine ?? []).map((row) => row.lobby_id as string);
  if (ids.length === 0) return null;

  const { data } = await supabase
    .from("lobbies")
    .select("id, name, games(slug)")
    .in("id", ids)
    .in("status", ["live", "started"])
    .limit(1);
  const row = (data ?? [])[0] as
    | { id: string; name: string; games: { slug: string } | { slug: string }[] | null }
    | undefined;
  const game = Array.isArray(row?.games) ? row?.games[0] : row?.games;
  return row && game ? { id: row.id, name: row.name, game: game.slug } : null;
}

/**
 * Every open lobby the player is in, for the "Your lobby" banner. The roster
 * comes from `lobby_members` (leader plus accepted), so a lobby you applied to
 * but were not accepted into is not here.
 */
export async function fetchMyLobbies(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyLobbies> {
  const none: MyLobbies = { current: null, scheduled: [] };
  await supabase.rpc("expire_stale_lobbies");

  const { data: mine } = await supabase
    .from("lobby_members")
    .select("lobby_id")
    .eq("user_id", userId);
  const ids = (mine ?? []).map((row) => row.lobby_id as string);
  if (ids.length === 0) return none;

  const { data: lobbyRows } = await supabase
    .from("lobbies")
    .select(
      "id, leader_id, mode_id, name, region, capacity, status, starts_at, cover, game_id, games(slug)",
    )
    .in("id", ids)
    .in("status", ["live", "started", "scheduled"]);
  const lobbies = (lobbyRows ?? []) as unknown as Array<{
    id: string;
    leader_id: string;
    mode_id: number;
    name: string;
    region: string;
    capacity: number;
    status: MyLobby["status"];
    starts_at: string | null;
    cover: string | null;
    games: { slug: string } | { slug: string }[] | null;
  }>;
  if (lobbies.length === 0) return none;

  const lobbyIds = lobbies.map((lobby) => lobby.id);
  const ledIds = lobbies.filter((lobby) => lobby.leader_id === userId).map((lobby) => lobby.id);

  const [{ data: roster }, { data: modes }, { data: pendingRows }] = await Promise.all([
    supabase.from("lobby_members").select("lobby_id, user_id, is_leader").in("lobby_id", lobbyIds),
    supabase
      .from("game_modes")
      .select("id, kind")
      .in("id", [...new Set(lobbies.map((lobby) => lobby.mode_id))]),
    ledIds.length > 0
      ? supabase
          .from("applications")
          .select("lobby_id")
          .in("lobby_id", ledIds)
          .eq("status", "pending")
      : Promise.resolve({ data: [] as Array<{ lobby_id: string }> }),
  ]);

  const memberRows = (roster ?? []) as Array<{ lobby_id: string; user_id: string; is_leader: boolean }>;
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, username, avatar_path")
    .in("id", [...new Set(memberRows.map((member) => member.user_id))]);
  const profiles = new Map(
    ((profileRows ?? []) as Array<{ id: string; username: string; avatar_path: string | null }>).map(
      (profile) => [profile.id, profile],
    ),
  );
  const kindOf = new Map(
    ((modes ?? []) as Array<{ id: number; kind: LfgMode }>).map((mode) => [mode.id, mode.kind]),
  );

  // Soonest first, by the real start time (the label is only for display).
  lobbies.sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));

  const shaped = lobbies.map((lobby): MyLobby => {
    const game = Array.isArray(lobby.games) ? lobby.games[0] : lobby.games;
    const slug = game?.slug ?? "";
    return {
      id: lobby.id,
      name: lobby.name,
      game: slug,
      cover: coverSrc(slug, lobby.cover),
      mode: kindOf.get(lobby.mode_id) ?? "casual",
      status: lobby.status,
      region: lobby.region,
      slotsTotal: lobby.capacity,
      members: memberRows
        .filter((member) => member.lobby_id === lobby.id)
        .sort((a, b) => Number(b.is_leader) - Number(a.is_leader))
        .map((member) => {
          const profile = profiles.get(member.user_id);
          return { id: member.user_id, name: profile?.username, avatar: avatarUrl(profile?.avatar_path) };
        }),
      isLeader: lobby.leader_id === userId,
      pendingRequests: (pendingRows ?? []).filter((row) => row.lobby_id === lobby.id).length,
      scheduledFor:
        lobby.status === "scheduled" && lobby.starts_at ? startLabel(lobby.starts_at) : undefined,
    };
  });

  return {
    current: shaped.find((lobby) => lobby.status !== "scheduled") ?? null,
    scheduled: shaped.filter((lobby) => lobby.status === "scheduled"),
  };
}
