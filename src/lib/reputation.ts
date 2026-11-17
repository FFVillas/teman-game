/**
 * How reputation is shown (proposal 3.3.1.2). The score itself is computed in
 * the database; this only decides the wording around it.
 */

/** Rated by fewer than this many different players: "New player". */
export const NEW_PLAYER_RATERS = 5;

export function isNewPlayer(raterCount: number): boolean {
  return raterCount < NEW_PLAYER_RATERS;
}

export interface SanctionEntry {
  type: "warning" | "suspension";
  /** The rule that was broken, as the moderator recorded it. */
  reason: string;
  issuedAt: string;
  /** Null for a warning, or a suspension with no end date. */
  expiresAt: string | null;
  /** A suspension still running. Worked out on the server, at read time. */
  active: boolean;
}

const day = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

/** "12 Nov 2026" for a warning; "12 Nov 2026 – 19 Nov 2026" for a suspension. */
export function sanctionDates(entry: SanctionEntry): string {
  if (entry.type === "warning") return day(entry.issuedAt);
  return entry.expiresAt
    ? `${day(entry.issuedAt)} – ${day(entry.expiresAt)}`
    : `From ${day(entry.issuedAt)}, no end date`;
}
