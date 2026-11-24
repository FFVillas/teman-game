import type { SupabaseClient } from "@supabase/supabase-js";
import { coverSrc } from "@/data/lfg-covers";
import { regionLabel } from "@/data/game-regions";
import type { MatchRecord, MatchTeammate } from "@/data/match-history";
import { rankIconFor } from "@/data/rank-icons";
import { roleIconFor } from "@/data/role-icons";
import type { LfgMode } from "@/data/lfg-teams";
import { avatarUrl } from "@/lib/avatar";
import type { GameInfo } from "@/lib/games";
import { formatAgo } from "@/lib/relative-time";

/**
 * A player's real match history: completed lobbies they played in, read
 * through `player_matches()` (20261118000000_match_history.sql), shaped as the
 * `MatchRecord` the history screens draw. For the player's own history each
 * teammate says whether the viewer has rated them yet.
 */

/** The database refuses ratings for a lobby that ran less than this. */
const MIN_PLAYED_MS = 15 * 60_000;

interface MatchRow {
  lobby_id: string;
  teammate_id: string;
  teammate_was_leader: boolean;
  teammate_role_id: number | null;
  rated: boolean | null;
  can_rate: boolean;
}

interface LobbyRow {
  id: string;
  name: string;
  region: string;
  cover: string | null;
  leader_id: string;
  game_id: number;
  started_at: string | null;
  closed_at: string | null;
  game_modes: { kind: LfgMode; label: string } | null;
}

interface PersonRow {
  id: string;
  username: string;
  avatar_path: string | null;
  user_game_mapping: { game_id: number; rank_id: number | null }[];
}

function durationLabel(startedAt: string | null, closedAt: string | null): string {
  if (!startedAt || !closedAt) return "—";
  const minutes = Math.round((Date.parse(closedAt) - Date.parse(startedAt)) / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

function dateLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export async function fetchPlayerMatches(
  supabase: SupabaseClient,
  catalog: GameInfo[],
  userId: string,
  viewerId: string | null,
): Promise<MatchRecord[]> {
  // Ratings that waited their 48 hours become visible on read, the same way
  // stale lobbies expire on read.
  if (viewerId) await supabase.rpc("release_due_reviews");

  const { data } = await supabase.rpc("player_matches", { p_user: userId });
  const rows = (data ?? []) as MatchRow[];
  if (rows.length === 0) return [];

  const lobbyIds = [...new Set(rows.map((row) => row.lobby_id))];
  const teammateIds = [...new Set(rows.map((row) => row.teammate_id))];
  const [{ data: lobbyRows }, { data: peopleRows }] = await Promise.all([
    supabase
      .from("lobby")
      .select(
        "id, name, region, cover, leader_id, game_id, started_at, closed_at, game_modes(kind, label)",
      )
      .in("id", lobbyIds),
    supabase
      .from("profiles")
      .select("id, username, avatar_path, user_game_mapping(game_id, rank_id)")
      .in("id", teammateIds),
  ]);

  const people = new Map(
    ((peopleRows ?? []) as unknown as PersonRow[]).map((person) => [person.id, person]),
  );

  const toTeammate = (row: MatchRow, game: GameInfo): MatchTeammate => {
    const person = people.get(row.teammate_id);
    const rankId = person?.user_game_mapping.find((entry) => entry.game_id === game.id)?.rank_id;
    const rank = game.ranks.find((entry) => entry.id === rankId);
    const role = game.roles.find((entry) => entry.id === row.teammate_role_id);
    return {
      id: row.teammate_id,
      name: person?.username ?? "Unknown",
      slug: person?.username,
      avatar: avatarUrl(person?.avatar_path),
      rank: rank
        ? { name: rank.name, icon: rankIconFor(game.slug, rank) ?? "", colorClass: "text-white/90" }
        : undefined,
      role: role ? { name: role.name, icon: roleIconFor(game.slug, role.name) ?? "" } : undefined,
      wasLeader: row.teammate_was_leader,
      // Someone else's history has nothing for the viewer to do.
      reviewed: row.rated ?? true,
    };
  };

  return ((lobbyRows ?? []) as unknown as LobbyRow[])
    .sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""))
    .flatMap((lobby): MatchRecord[] => {
      const game = catalog.find((entry) => entry.id === lobby.game_id);
      if (!game) return [];
      const played =
        lobby.started_at && lobby.closed_at
          ? Date.parse(lobby.closed_at) - Date.parse(lobby.started_at)
          : 0;
      return [
        {
          id: lobby.id,
          lobbyName: lobby.name,
          lobbyType: lobby.game_modes?.label ?? "Lobby",
          game: game.slug,
          cover: coverSrc(game.slug, lobby.cover),
          mode: lobby.game_modes?.kind ?? "casual",
          region: regionLabel(game.slug, lobby.region),
          endedOn: dateLabel(lobby.closed_at),
          endedAgo: lobby.closed_at ? formatAgo(lobby.closed_at) : "—",
          duration: durationLabel(lobby.started_at, lobby.closed_at),
          viewerWasLeader: lobby.leader_id === userId,
          rateable: played >= MIN_PLAYED_MS,
          teammates: rows
            .filter((row) => row.lobby_id === lobby.id)
            .map((row) => toTeammate(row, game)),
        },
      ];
    });
}
