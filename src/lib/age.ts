export const MINIMUM_AGE = 13;

/**
 * Whole years between an ISO date ("YYYY-MM-DD") and today, or null when the
 * string isn't a real calendar date. Mirrors Postgres' age() so the form and
 * the database agree on who is old enough.
 */
export function ageFromDate(iso: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];

  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  if (!isRealDate) return null;

  let years = today.getFullYear() - year;
  const hadBirthday =
    today.getMonth() > month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() >= day);
  if (!hadBirthday) years -= 1;
  return years;
}

export interface DateParts {
  year: string;
  month: string;
  day: string;
}

export const emptyDateParts: DateParts = { year: "", month: "", day: "" };

/** "2003-04-09" → { year: "2003", month: "4", day: "9" } (month is 1–12). */
export function splitDate(iso: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return emptyDateParts;
  return {
    year: String(Number(match[1])),
    month: String(Number(match[2])),
    day: String(Number(match[3])),
  };
}

/** ISO date when all three parts are set, otherwise "". */
export function joinDate({ year, month, day }: DateParts): string {
  if (!year || !month || !day) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Returns an error message, or null when the date is acceptable (or empty). */
export function validateDateOfBirth(iso: string): string | null {
  if (!iso) return null;
  const age = ageFromDate(iso);
  if (age === null) return "Enter a valid date.";
  if (age < MINIMUM_AGE) return `You must be at least ${MINIMUM_AGE} years old.`;
  if (age > 120) return "Enter a valid date.";
  return null;
}
