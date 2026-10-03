/**
 * Usernames end up in URLs (`/profile/<username>`), so they're restricted to
 * characters that are safe there. Enforced in the signup and edit forms —
 * not in the database, because the signup trigger also has to cope with
 * accounts that arrive without a chosen username (OAuth, later).
 */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

/** Returns an error message, or null when the username is acceptable. */
export function validateUsername(value: string): string | null {
  const username = value.trim();
  if (!username) return "Pick a username.";
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Use ${USERNAME_MIN}–${USERNAME_MAX} characters.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Letters, numbers, dots, dashes and underscores only.";
  }
  return null;
}
