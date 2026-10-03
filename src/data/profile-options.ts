// Fixed vocabularies for the profile edit form. Languages and days are
// stored as plain codes/names in the database; the vocabulary lives here so
// adding a language doesn't need a migration.

export const MAX_LANGUAGES = 8;

/**
 * Personality tags a player can claim, shared by onboarding and the edit form
 * so the two can't disagree. A teammate raised this from 3 to 5 on purpose
 * ("change limit personality tags in profile").
 *
 * Worth knowing: there are only 5 tags, so a cap of 5 is no cap at all. The
 * matching score's T term is |A∩B|/|B| against the tags a lobby asks for, so
 * a player who claims every tag always gets T = 1. If that should be
 * prevented, lower this number — it is the only place to change.
 */
export const MAX_PERSONALITY_TAGS = 5;

export const languageOptions = [
  "Indonesian",
  "English",
  "Javanese",
  "Sundanese",
  "Malay",
  "Mandarin",
  "Cantonese",
  "Japanese",
  "Korean",
  "Tagalog",
  "Thai",
  "Vietnamese",
  "Hindi",
  "Arabic",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Russian",
] as const;

/** Codes are what the database stores (`profiles.play_days`). */
export const playDayOptions = [
  { code: "mon", label: "Mon" },
  { code: "tue", label: "Tue" },
  { code: "wed", label: "Wed" },
  { code: "thu", label: "Thu" },
  { code: "fri", label: "Fri" },
  { code: "sat", label: "Sat" },
  { code: "sun", label: "Sun" },
] as const;

/**
 * UTC offsets, not country zones — what `profiles.timezone` stores, as
 * "UTC+07:00". An offset is all schedule overlap needs, and play hours are
 * a fixed wall-clock window, so daylight-saving rules don't matter here.
 * Every offset in use today, including the half- and quarter-hour ones.
 */
export const timezoneOptions = [
  "-12:00",
  "-11:00",
  "-10:00",
  "-09:30",
  "-09:00",
  "-08:00",
  "-07:00",
  "-06:00",
  "-05:00",
  "-04:00",
  "-03:30",
  "-03:00",
  "-02:00",
  "-01:00",
  "+00:00",
  "+01:00",
  "+02:00",
  "+03:00",
  "+03:30",
  "+04:00",
  "+04:30",
  "+05:00",
  "+05:30",
  "+05:45",
  "+06:00",
  "+06:30",
  "+07:00",
  "+08:00",
  "+08:45",
  "+09:00",
  "+09:30",
  "+10:00",
  "+10:30",
  "+11:00",
  "+12:00",
  "+12:45",
  "+13:00",
  "+14:00",
].map((offset) => `UTC${offset}`);

/** Indonesia's most common zone (WIB) — the audience this is built for. */
export const DEFAULT_TIMEZONE = "UTC+07:00";

export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
