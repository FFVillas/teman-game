/**
 * The link to a player's profile. Profiles are looked up by username,
 * case-insensitively (`fetchProfileByUsername`), so the username itself is
 * the URL segment; usernames are limited to [A-Za-z0-9_.-] for this reason.
 *
 * This file used to also build *placeholder* profiles from the mock social
 * data, so mock rows didn't dead-end on a 404. The mock data is gone, and an
 * unknown name now gets the ordinary 404.
 */
export function profileHrefFor(username: string): string {
  return `/profile/${encodeURIComponent(username)}`;
}
