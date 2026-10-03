/**
 * What a suspended or banned player sees when they try to log in.
 *
 * Deliberately limited to what the player is entitled to know: the rule they
 * broke and the dates. The moderator's internal note, the moderator's name
 * and who reported them never leave the admin console.
 */

export interface RestrictionNotice {
  username: string;
  avatar: string;
  type: "suspension" | "ban";
  reason: string;
  issuedAt: string;
  /** Suspensions only. */
  expiresAt?: string;
}

/**
 * Handed from the login form to /account-restricted. sessionStorage rather
 * than the URL so account details never end up in history or logs.
 */
export const RESTRICTION_NOTICE_KEY = "temangame:restriction-notice";

export const restrictionCopy = {
  suspension: {
    title: "Your account is suspended",
    subtitle: "A moderator reviewed reports about your account.",
    effects: [
      "You can't log in, join or create lobbies, or send messages.",
      "Your profile, reviews and match history stay as they are.",
    ],
    next: "You can log in again as soon as the suspension ends.",
  },
  ban: {
    title: "Your account has been banned",
    subtitle: "A moderator closed this account permanently.",
    effects: [
      "You can no longer log in or use TemanGame with this account.",
      "Other players can't find you in lobbies or search.",
    ],
    next: "This decision is final.",
  },
  missing: {
    title: "Nothing to show",
    subtitle: "This page only appears after a restricted account tries to log in.",
  },
};
