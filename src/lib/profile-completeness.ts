import type { PlayerProfile } from "@/data/player-profiles";

/**
 * What's still missing from a profile, for the owner's own prompt.
 *
 * Only fields the player can actually fill in today count — rank, linked
 * accounts and match history arrive with the Lobby slice, so counting them
 * would mean a profile that can never reach 100%.
 *
 * The order is the order they're nagged about: the two the matchmaking score
 * reads (playstyle → P, tags → T) come first, then what teammates read.
 */
export interface ProfileGap {
  key: string;
  label: string;
  /** Why it matters, shown under the prompt. */
  hint: string;
}

export function profileGaps(profile: PlayerProfile): ProfileGap[] {
  const gaps: ProfileGap[] = [];

  if (!profile.playstyle) {
    gaps.push({
      key: "playstyle",
      label: "Playstyle",
      hint: "Lobby matching compares this first.",
    });
  }
  if (profile.personalityTags.length === 0) {
    gaps.push({
      key: "tags",
      label: "Personality tags",
      hint: "Lobbies can ask for specific tags.",
    });
  }
  if (!profile.dossier.availability) {
    gaps.push({
      key: "availability",
      label: "Play hours",
      hint: "Overlapping hours decide who can actually queue with you.",
    });
  }
  if (!profile.dossier.languages) {
    gaps.push({ key: "languages", label: "Languages", hint: "Comms matter." });
  }
  if (!profile.avatar) {
    gaps.push({
      key: "avatar",
      label: "Profile picture",
      hint: "Rows look unfinished without one.",
    });
  }
  if (!profile.dossier.age) {
    gaps.push({
      key: "age",
      label: "Date of birth",
      hint: "Only your age is shown.",
    });
  }
  if (!profile.dossier.gender) {
    gaps.push({ key: "gender", label: "Gender", hint: "Optional." });
  }

  return gaps;
}

export const PROFILE_FIELD_COUNT = 7;

export function profileCompleteness(profile: PlayerProfile): {
  percent: number;
  gaps: ProfileGap[];
} {
  const gaps = profileGaps(profile);
  return {
    percent: Math.round(
      ((PROFILE_FIELD_COUNT - gaps.length) / PROFILE_FIELD_COUNT) * 100
    ),
    gaps,
  };
}
