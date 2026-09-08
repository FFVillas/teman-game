import {
  playerProfiles,
  type PlayerProfile,
} from "./player-profiles";
import { onlineFriends, offlineFriends } from "./social-friends";
import { discoverPlayers } from "./social-discover";
import { recentTeammates } from "./social-recent";
import { pendingRequests } from "./social-pending";

/**
 * Every player row in the app links to a profile, but only a handful of
 * people have a full mock record. Rather than dead-ending those clicks on a
 * 404, this resolves a *placeholder* profile from whatever we do know about
 * them (their name and avatar) so the profile screen — and the Report button
 * on it — still works.
 *
 * Once the backend exists this collapses into a single `users` query and the
 * placeholder branch goes away.
 */

/** Deterministic, and matches the keys already used in `playerProfiles`. */
export function profileSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

interface KnownPerson {
  name: string;
  avatar: string;
}

/** Everyone the mock data mentions anywhere, keyed by slug. */
const directory: Record<string, KnownPerson> = {};

function remember(name: string, avatar: string) {
  const slug = profileSlug(name);
  if (!slug || directory[slug]) return;
  directory[slug] = { name, avatar };
}

for (const friend of [...onlineFriends, ...offlineFriends]) {
  remember(friend.name, friend.avatar);
}
for (const player of discoverPlayers) remember(player.name, player.avatar);
for (const teammate of recentTeammates) remember(teammate.name, teammate.avatar);
for (const request of pendingRequests) remember(request.name, request.avatar);

/**
 * A profile we can render without inventing stats. Everything unknown reads
 * as "Not set" rather than a plausible-looking fake number — this is a
 * product about trustworthy player data, so filler here would be the wrong
 * kind of convincing.
 */
function placeholderProfile(slug: string, person: KnownPerson): PlayerProfile {
  return {
    slug,
    username: person.name,
    avatar: person.avatar,
    isOnline: false,
    isPlaceholder: true,
    ratingScore: 0,
    reviewCount: 0,
    personalityTags: [],
    dossier: {
      age: 0,
      gender: "",
      languages: "",
      availability: "",
    },
    connections: [],
    gameStats: [],
    recentTeams: [],
    memberSince: "—",
    lastMatch: "—",
    region: "—",
  };
}

/** Full record when we have one, otherwise a placeholder. */
export function resolveProfile(slug: string): PlayerProfile | undefined {
  const existing = playerProfiles[slug];
  if (existing) return existing;

  const person = directory[slug];
  if (!person) return undefined;

  return placeholderProfile(slug, person);
}

/** Slug for any name, used to build links from social rows. */
export function profileHrefFor(name: string): string {
  return `/profile/${profileSlug(name)}`;
}
