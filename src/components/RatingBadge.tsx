/**
 * The one way a player's rating is shown: "★ 4.9 (201)". The number is the
 * plain average of their ratings (Persamaan 3.12); the count in brackets is
 * how many different players rated them, not how many ratings, a shade
 * greyer so it reads as a footnote to the score rather than part of it.
 * Callers show "No ratings yet" instead when there is no rating.
 */
export default function RatingBadge({
  value,
  raters,
  showStar = true,
  className = "",
}: {
  value: number;
  /** Different players who rated them. Omitted where it isn't known. */
  raters?: number;
  /** Off where something else already draws the stars (the profile's row of five). */
  showStar?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}
      title={
        raters === undefined
          ? undefined
          : `Rated by ${raters} ${raters === 1 ? "player" : "players"}`
      }
    >
      {showStar && (
        <span aria-hidden className="text-star">
          ★
        </span>
      )}
      <span className="font-bold text-white">{value.toFixed(1)}</span>
      {raters !== undefined && <span className="text-white/55">({raters})</span>}
    </span>
  );
}
