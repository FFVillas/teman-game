import { createSeedAdminData, type AdminData } from "@/data/admin-moderation";
import type { RestrictionNotice } from "@/data/account-restriction";
import { activeRestriction } from "./admin";

/** Bump when the seed shape changes so stale demo state gets replaced. */
export const ADMIN_STORAGE_KEY = "temangame:admin-data:v1";

/**
 * The moderation data outside the admin console — e.g. the login screen
 * checking whether an account is suspended. Reads whatever the console last
 * saved, so a sanction issued in /admin takes effect on the next login.
 *
 * Client-only (localStorage). TODO: replace with a server-side check against
 * the `sanctions` table during sign-in.
 */
export function readStoredAdminData(): AdminData {
  try {
    const stored = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as AdminData;
  } catch {
    // Unreadable or blocked storage: fall back to the seed.
  }
  return createSeedAdminData();
}

/**
 * The suspension or ban currently stopping this email from logging in, if
 * any. Expired suspensions and lifted sanctions don't count, so the account
 * works again the moment a restriction ends.
 */
export function restrictionForEmail(email: string): RestrictionNotice | null {
  const data = readStoredAdminData();
  const target = email.trim().toLowerCase();
  const player = data.players.find((p) => p.email.toLowerCase() === target);
  if (!player) return null;

  const sanction = activeRestriction(player.id, data.sanctions);
  if (!sanction || sanction.type === "warning") return null;

  return {
    username: player.username,
    avatar: player.avatar,
    type: sanction.type,
    reason: sanction.reason,
    issuedAt: sanction.issuedAt,
    expiresAt: sanction.expiresAt,
  };
}
