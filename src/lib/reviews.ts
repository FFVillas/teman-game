import type { SupabaseClient } from "@supabase/supabase-js";
import type { LowRatingReason } from "@/data/review-options";

/**
 * Rating a teammate after a completed lobby, through `submit_review`
 * (20261116000200_reviews.sql). The database enforces every rule: the lobby
 * ended after at least the minimum (`app_setting.min_lobby_minutes`), both people played in it, one rating per
 * teammate, and a reason for 1–2 stars.
 */

export interface ReviewInput {
  lobbyId: string;
  rateeId: string;
  stars: number;
  reason: LowRatingReason | null;
  tagIds: number[];
}

function reviewErrorMessage(error: { code?: string; message?: string }): string {
  const text = error.message ?? "";
  if (error.code === "23505") return "You've already rated this player for this lobby.";
  if (text.includes("cannot_review")) {
    return "Ratings are only open for lobbies that ran long enough, between players who played in them.";
  }
  if (text.includes("reviews_low_rating_needs_reason")) {
    return "Pick a reason for a rating of 1 or 2 stars.";
  }
  if (text.includes("not_signed_in")) return "Log in to rate players.";
  return "Couldn't save the rating. Try again.";
}

/** Returns an error message, or null when the rating was saved. */
export async function submitReview(
  supabase: SupabaseClient,
  input: ReviewInput,
): Promise<string | null> {
  const { error } = await supabase.rpc("submit_review", {
    p_lobby: input.lobbyId,
    p_ratee: input.rateeId,
    p_stars: input.stars,
    p_reason: input.reason,
    p_tag_ids: input.tagIds.length > 0 ? input.tagIds : null,
  });
  return error ? reviewErrorMessage(error) : null;
}
