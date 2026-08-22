/**
 * Where to send someone after they log in or sign up.
 *
 * The rule is "back to the page you were on", carried through the auth
 * screens as a `?next=` query param. Falls back to the LFG page when there's
 * nothing sensible to return to.
 */

export const DEFAULT_REDIRECT = "/lfg/valorant";

/** Auth screens themselves are never a valid destination — that would loop. */
function isAuthPath(path: string) {
  return path.startsWith("/login") || path.startsWith("/signup");
}

/**
 * Only same-origin absolute paths are allowed through. Anything with a scheme
 * ("https://evil.com") or a protocol-relative prefix ("//evil.com") is
 * discarded — otherwise `?next=` is an open redirect.
 */
export function sanitizeNextPath(value: string | null | undefined): string {
  if (!value) return DEFAULT_REDIRECT;
  if (!value.startsWith("/")) return DEFAULT_REDIRECT;
  if (value.startsWith("//")) return DEFAULT_REDIRECT;
  if (isAuthPath(value)) return DEFAULT_REDIRECT;
  return value;
}

/** Builds `/login?next=<from>`, omitting the param when it adds nothing. */
export function withNext(href: string, from: string | null | undefined): string {
  if (!from || !from.startsWith("/") || from.startsWith("//") || isAuthPath(from)) {
    return href;
  }
  return `${href}?next=${encodeURIComponent(from)}`;
}
