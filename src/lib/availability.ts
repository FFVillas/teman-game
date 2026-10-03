import { playDayOptions } from "@/data/profile-options";

export interface Availability {
  days: string[];
  /** "HH:MM" (24h), or "" when unset. Both or neither of start/end. */
  start: string;
  end: string;
  timezone: string;
}

/** Postgres returns `time` as "20:00:00"; the time input wants "20:00". */
export function trimSeconds(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : "";
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** Every half hour, "00:00" → "12:00 AM" … "23:30" → "11:30 PM". */
export const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const value = `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
  return { value, label: formatTime(value) };
});

/** "UTC+07:00" → "UTC+7", "UTC+05:30" → "UTC+5:30". Unknown values pass through. */
function shortOffset(timezone: string): string {
  const match = /^UTC([+-])(\d{2}):(\d{2})$/.exec(timezone);
  if (!match) return timezone;
  const [, sign, hours, minutes] = match;
  return `UTC${sign}${Number(hours)}${minutes === "00" ? "" : `:${minutes}`}`;
}

function formatDays(days: string[]): string {
  const set = new Set(days);
  if (set.size === 7) return "Every day";
  const isWeekdays =
    set.size === 5 && ["mon", "tue", "wed", "thu", "fri"].every((d) => set.has(d));
  if (isWeekdays) return "Weekdays";
  if (set.size === 2 && set.has("sat") && set.has("sun")) return "Weekends";
  // Keep calendar order regardless of the order they were picked in.
  return playDayOptions
    .filter((day) => set.has(day.code))
    .map((day) => day.label)
    .join(", ");
}

/**
 * One readable line for the profile, e.g. "Weekdays · 8:00 PM – 12:00 AM WIB".
 * Empty string when nothing is set, so the caller can show "Not set".
 */
export function formatAvailability({
  days,
  start,
  end,
  timezone,
}: Availability): string {
  const parts: string[] = [];
  if (days.length > 0) parts.push(formatDays(days));
  if (start && end) {
    const zone = shortOffset(timezone);
    parts.push(`${formatTime(start)} – ${formatTime(end)}${zone ? ` ${zone}` : ""}`);
  }
  return parts.join(" · ");
}
