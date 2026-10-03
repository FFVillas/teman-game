import type { SupabaseClient } from "@supabase/supabase-js";
import {
  personalityTagOptions,
  type PersonalityTag,
  type PlayerProfile,
} from "@/data/player-profiles";
import { formatAvailability, trimSeconds } from "@/lib/availability";

/** Columns of `public.profiles` the profile screens read, plus the derived age. */
export interface ProfileRow {
  id: string;
  username: string;
  avatar_url: string | null;
  playstyle: number | null;
  personality_tags: string[];
  reputation_score: number;
  review_count: number;
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
  "id, username, avatar_url, playstyle, personality_tags, reputation_score, review_count, created_at, gender, languages, play_days, play_start, play_end, timezone";

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
 * Maps a real row onto the `PlayerProfile` shape the profile UI was built
 * against. Anything the database can't answer yet (linked accounts, per-game
 * rank/stats, match history, region) is left empty and renders as "Not set"
 * — those arrive with the Lobby slice, not here.
 */
export function profileFromRow(
  row: ProfileRow,
  { isOwner }: { isOwner: boolean },
): PlayerProfile {
  const knownTags = new Set<string>(personalityTagOptions);

  return {
    slug: row.username,
    username: row.username,
    avatar: row.avatar_url ?? "",
    isOnline: false,
    isOwner,
    ratingScore: Number(row.reputation_score),
    reviewCount: row.review_count,
    playstyle: row.playstyle ?? undefined,
    personalityTags: row.personality_tags.filter((tag): tag is PersonalityTag =>
      knownTags.has(tag),
    ),
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
