/**
 * Why a 1–2 star rating was given: the four kinds of bad behaviour
 * respondents met most (proposal, Gambar L2.8). Required for a low rating,
 * never counted in the score; it is a note for moderators.
 * `value` is what `reviews.low_rating_reason` stores.
 */
export const lowRatingReasons = [
  { value: "afk", label: "AFK / left the game" },
  { value: "flaming", label: "Flaming / provocation" },
  { value: "trolling", label: "Trolling / sabotage" },
  { value: "verbal_abuse", label: "Verbal abuse" },
] as const;

export type LowRatingReason = (typeof lowRatingReasons)[number]["value"];

/** Ratings at or below this need a reason. */
export const LOW_RATING_MAX = 2;
