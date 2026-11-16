import type { SupabaseClient } from "@supabase/supabase-js";
import {
  personalityTagOptions,
  type PersonalityTag,
} from "@/data/player-profiles";
import {
  MAX_PERSONALITY_TAGS,
  MIN_PERSONALITY_TAGS,
} from "@/data/profile-options";

/**
 * Personality tags, backed by `tag` + `user_tag`
 * (`20261116000000_personality_tags.sql`).
 *
 * They used to be a `text[]` on `profiles`. The proposal revision asked for a
 * table on 1NF grounds, but the practical reason is Persamaan 3.13: tag
 * *strength* counts how many distinct raters gave a tag, which needs a row per
 * (rater, tag) and cannot come from an array on the player's own row.
 *
 * `tag.id` is a smallint the UI never shows — screens work in tag names, which
 * are the `PersonalityTag` union. This module is the only place the two are
 * mapped onto each other.
 */

interface TagRow {
  id: number;
  name: string;
}

const known = new Set<string>(personalityTagOptions);

function isKnown(name: string): name is PersonalityTag {
  return known.has(name);
}

/** The five tags, in the order the forms list them. */
export async function fetchTagCatalog(
  supabase: SupabaseClient,
): Promise<{ id: number; name: PersonalityTag }[]> {
  const { data } = await supabase
    .from("tag")
    .select("id, name")
    .order("sort_order");

  return ((data ?? []) as TagRow[])
    .filter((row): row is TagRow & { name: PersonalityTag } => isKnown(row.name))
    .map((row) => ({ id: row.id, name: row.name }));
}

/** One player's own tags (`p_t` in Persamaan 3.13). */
export async function fetchUserTags(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersonalityTag[]> {
  const { data } = await supabase
    .from("user_tag")
    .select("tag (name)")
    .eq("user_id", userId);

  const rows = (data ?? []) as unknown as Array<{ tag: { name: string } | null }>;
  return rows
    .map((row) => row.tag?.name)
    .filter((name): name is PersonalityTag => Boolean(name) && isKnown(name!));
}

/** Tags for several players at once, for lists and the invite picker. */
export async function fetchTagsByUser(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, PersonalityTag[]>> {
  const byUser = new Map<string, PersonalityTag[]>();
  if (userIds.length === 0) return byUser;

  const { data } = await supabase
    .from("user_tag")
    .select("user_id, tag (name)")
    .in("user_id", userIds);

  const rows = (data ?? []) as unknown as Array<{
    user_id: string;
    tag: { name: string } | null;
  }>;
  for (const row of rows) {
    const name = row.tag?.name;
    if (!name || !isKnown(name)) continue;
    byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), name]);
  }
  return byUser;
}

/**
 * Replaces a player's whole set of tags.
 *
 * Delete-then-insert in one call rather than a diff: the set is at most five
 * rows, and the database's count rule is a **deferred** constraint trigger, so
 * it only looks once the transaction commits. An intermediate state of zero or
 * one row is therefore fine — which a diff would also have to rely on, with
 * more code.
 *
 * Returns null on success, or a message to show the player.
 */
export async function saveUserTags(
  supabase: SupabaseClient,
  userId: string,
  tags: readonly PersonalityTag[],
): Promise<string | null> {
  const catalog = await fetchTagCatalog(supabase);
  const idOf = new Map(catalog.map((entry) => [entry.name, entry.id]));

  const ids = tags
    .map((name) => idOf.get(name))
    .filter((id): id is number => id !== undefined);

  if (ids.length !== tags.length) {
    return "Couldn't save your tags. Try again.";
  }

  const { error: clearError } = await supabase
    .from("user_tag")
    .delete()
    .eq("user_id", userId);
  if (clearError) return tagCountMessage(clearError) ?? "Couldn't save your tags. Try again.";

  if (ids.length === 0) return null;

  const { error } = await supabase
    .from("user_tag")
    .insert(ids.map((tagId) => ({ user_id: userId, tag_id: tagId })));

  return error
    ? (tagCountMessage(error) ?? "Couldn't save your tags. Try again.")
    : null;
}

/**
 * The count rule lives in the database so it holds however the rows are
 * written; this turns its two exceptions into something readable.
 */
function tagCountMessage(error: {
  code?: string;
  message?: string;
}): string | null {
  const text = error.message ?? "";
  if (text.includes("too_few_tags")) {
    return `Pick at least ${MIN_PERSONALITY_TAGS} personality tags, or none at all.`;
  }
  if (text.includes("too_many_tags")) {
    return `Pick at most ${MAX_PERSONALITY_TAGS} personality tags.`;
  }
  return null;
}

/**
 * Persamaan 3.13 — how strongly each player carries each tag, 0.00–1.00.
 *
 * Comes from a database function rather than a query: `n_t` counts distinct
 * raters, which means reading `review_tag`, and that table is closed to
 * clients so a rating can't be traced back to its author. The function
 * returns aggregates only, so it gives the number without the names.
 *
 * A player nobody has rated yet scores 1.00 on every tag they picked, so new
 * accounts still surface in the picker.
 */
export async function fetchTagStrengths(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, Map<number, number>>> {
  const byUser = new Map<string, Map<number, number>>();
  if (userIds.length === 0) return byUser;

  const { data } = await supabase.rpc("tag_strengths", { p_users: userIds });

  for (const row of (data ?? []) as Array<{
    user_id: string;
    tag_id: number;
    strength: number | string;
  }>) {
    const forUser = byUser.get(row.user_id) ?? new Map<number, number>();
    forUser.set(row.tag_id, Number(row.strength));
    byUser.set(row.user_id, forUser);
  }
  return byUser;
}
