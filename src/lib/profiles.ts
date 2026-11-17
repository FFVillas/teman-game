import type { SupabaseClient } from "@supabase/supabase-js";
import {
  personalityTagOptions,
  type PersonalityTag,
  type PlayerProfile,
} from "@/data/player-profiles";
import { MINIMUM_AGE } from "@/lib/age";
import { formatAvailability, trimSeconds } from "@/lib/availability";
import { avatarUrl } from "@/lib/avatar";
import type { PlayerGameSetup } from "@/lib/games";
import type { SanctionEntry } from "@/lib/reputation";

/** Columns of `public.profiles` the profile screens read, plus the derived age. */
export interface ProfileRow {
  id: string;
  username: string;
  /** Path inside the avatars bucket, not a URL — see src/lib/avatar.ts. */
  avatar_path: string | null;
  playstyle: number | null;
  /**
   * Joined from `user_tag`, not a column. The old `profiles.personality_tags`
   * array is no longer read anywhere — see src/lib/tags.ts for why the tags
   * had to become rows.
   */
  user_tag: Array<{ tag: { name: string } | null }> | null;
  reputation_score: number;
  review_count: number;
  /** Computed column: how many different players rated them. */
  rater_count: number;
  created_at: string;
  gender: string | null;
  languages: string[];
  play_days: string[];
  /** Postgres `time`: "20:00:00". */
  play_start: string | null;
  play_end: string | null;
  timezone: string | null;
  /** From profile_age() — the date of birth itself is never public. */
  age: number | null;
}

const PROFILE_COLUMNS =
  "id, username, avatar_path, playstyle, reputation_score, review_count, rater_count, created_at, " +
  "gender, languages, play_days, play_start, play_end, timezone, user_tag (tag (name))";

/** Adds the public, derived age. The date of birth lives in a private table. */
async function withAge(
  supabase: SupabaseClient,
  data: unknown,
): Promise<ProfileRow | null> {
  if (!data) return null;
  const row = data as Omit<ProfileRow, "age">;
  const { data: age } = await supabase.rpc("profile_age", {
    profile_id: row.id,
  });
  return { ...row, age: typeof age === "number" ? age : null };
}

/**
 * Looks a profile up by username, case-insensitively (the unique index is on
 * lower(username)). `ilike` treats `_` and `%` as wildcards, and `_` is
 * legal in usernames, so they're escaped — otherwise "a_b" would also match
 * "axb".
 */
export async function fetchProfileByUsername(
  supabase: SupabaseClient,
  username: string,
): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .ilike("username", username.replace(/[\\%_]/g, "\\$&"))
    .maybeSingle();
  return withAge(supabase, data);
}

export async function fetchProfileById(
  supabase: SupabaseClient,
  id: string,
): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return withAge(supabase, data);
}

/**
 * The signed-in user's own date of birth ("YYYY-MM-DD"), for the edit form.
 * RLS only returns the row to its owner, so this is empty for anyone else.
 */
export async function fetchOwnDateOfBirth(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profile_private")
    .select("date_of_birth")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.date_of_birth as string | null | undefined) ?? "";
}

/**
 * Writes the signed-in user's date of birth ("YYYY-MM-DD", or null to clear
 * it). Returns an error message to show, or null on success.
 *
 * Update-then-insert rather than a single `upsert`, which fails with 42501
 * "permission denied for table profile_private". PostgREST compiles an
 * upsert to `insert ... on conflict do update set user_id = ...,
 * date_of_birth = ...`, and Postgres checks UPDATE privilege on every
 * column in that SET list while planning — even when no conflict happens.
 * The table deliberately grants UPDATE on `date_of_birth` only (the primary
 * key is not meant to be writable), so the statement is rejected before it
 * runs. Two statements that each stay inside the granted columns work
 * instead, and the narrow grant stays as it is.
 */
export async function saveDateOfBirth(
  supabase: SupabaseClient,
  userId: string,
  dateOfBirth: string | null,
): Promise<string | null> {
  const failed = "Couldn't save your date of birth. Try again.";

  const { data, error } = await supabase
    .from("profile_private")
    .update({ date_of_birth: dateOfBirth })
    .eq("user_id", userId)
    .select("user_id");

  if (error) return tooYoung(error) ?? failed;
  // A row came back, so it existed and is now updated.
  if (data && data.length > 0) return null;

  const { error: insertError } = await supabase
    .from("profile_private")
    .insert({ user_id: userId, date_of_birth: dateOfBirth });

  if (!insertError) return null;
  // 23505 = the row appeared between the two statements (two tabs saving at
  // once). The update is then the right call after all.
  if (insertError.code === "23505") {
    const { error: retryError } = await supabase
      .from("profile_private")
      .update({ date_of_birth: dateOfBirth })
      .eq("user_id", userId);
    return retryError ? (tooYoung(retryError) ?? failed) : null;
  }
  return tooYoung(insertError) ?? failed;
}

/** The minimum-age database trigger raises check_violation with a readable message. */
function tooYoung(error: { code?: string; message?: string }): string | null {
  return error.code === "23514" || error.message?.includes("years old")
    ? `You must be at least ${MINIMUM_AGE} years old.`
    : null;
}

/**
 * Maps a real row onto the `PlayerProfile` shape the profile UI was built
 * against. Anything the database can't answer yet (linked accounts, per-game
 * rank/stats, match history, region) is left empty and renders as "Not set"
 * — those arrive with the Lobby slice, not here.
 */
/**
 * The public part of a player's sanctions, newest first: type, rule and
 * dates, never the moderator's note (`sanction_history()`). Lifted sanctions
 * are left out.
 */
export async function fetchSanctionHistory(
  supabase: SupabaseClient,
  userId: string,
): Promise<SanctionEntry[]> {
  const { data } = await supabase.rpc("sanction_history", { p_user: userId });
  return ((data ?? []) as Array<{
    type: SanctionEntry["type"];
    reason: string;
    issued_at: string;
    expires_at: string | null;
  }>).map((row) => ({
    type: row.type,
    reason: row.reason,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    active:
      row.type === "suspension" &&
      (row.expires_at === null || Date.parse(row.expires_at) > Date.now()),
  }));
}

export function profileFromRow(
  row: ProfileRow,
  {
    isOwner,
    gameSetups,
    sanctions,
  }: { isOwner: boolean; gameSetups?: PlayerGameSetup[]; sanctions?: SanctionEntry[] },
): PlayerProfile {
  const knownTags = new Set<string>(personalityTagOptions);

  return {
    userId: row.id,
    slug: row.username,
    username: row.username,
    avatar: avatarUrl(row.avatar_path),
    isOnline: false,
    isOwner,
    ratingScore: Number(row.reputation_score),
    reviewCount: row.review_count,
    raterCount: row.rater_count,
    sanctions,
    playstyle: row.playstyle ?? undefined,
    personalityTags: (row.user_tag ?? [])
      .map((entry) => entry.tag?.name)
      .filter((name): name is PersonalityTag => Boolean(name) && knownTags.has(name!)),
    dossier: {
      age: row.age ?? 0,
      gender: row.gender ?? "",
      languages: row.languages.join(", "),
      availability: formatAvailability({
        days: row.play_days,
        start: trimSeconds(row.play_start),
        end: trimSeconds(row.play_end),
        timezone: row.timezone ?? "",
      }),
    },
    connections: [],
    gameSetups,
    // Win rate, LP and match counts need a game integration that doesn't
    // exist. `gameSetups` carries what the player typed in instead.
    gameStats: [],
    recentTeams: [],
    memberSince: new Date(row.created_at).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
    lastMatch: "—",
    region: "—",
  };
}
