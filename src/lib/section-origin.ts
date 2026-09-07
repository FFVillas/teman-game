/**
 * Remembers the last page visited *outside* a section, so a section's back
 * control can leave the section entirely instead of stepping back through
 * its own sub-pages.
 *
 * Social is the case this exists for: friends → discover → back should
 * return to wherever you were before you opened Social, not to friends.
 * `router.back()` can't express that — it only pops one entry.
 */

const KEY = "nav:lastOutsideSocial";

export const SOCIAL_PREFIX = "/social";
export const SOCIAL_FALLBACK = "/lfg/valorant";

export function isSocialPath(pathname: string): boolean {
  return pathname === SOCIAL_PREFIX || pathname.startsWith(`${SOCIAL_PREFIX}/`);
}

export function rememberOutsideSocial(pathname: string): void {
  if (typeof window === "undefined") return;
  if (isSocialPath(pathname)) return;
  window.sessionStorage.setItem(KEY, pathname);
}

export function readOutsideSocial(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(KEY);
}
