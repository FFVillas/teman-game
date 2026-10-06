/**
 * Game modes a lobby can be created for, per game, keyed by `games.slug`.
 *
 * Only modes that people actually *group up* for are listed: solo or
 * free-for-all modes (CS2 Deathmatch, Valorant Deathmatch, Co-Op vs AI…) are
 * left out because there is nobody to look for. The full researched list,
 * including those, is in docs/game-reference.md ("Game modes").
 *
 * `kind` reuses the three labels lobbies already carry (`LfgMode` in
 * lfg-teams.ts): ranked ladder modes, casual modes, and organised/tournament
 * play. `maxParty` is the largest premade group the queue allows, which caps
 * the "group size" when creating a lobby. Rotating modes come and go with
 * patches, so this list needs a look each season.
 *
 * Kept in the app for now; it becomes a `game_modes` table when lobbies are
 * stored in the database and need to point at a mode.
 */

export type ModeKind = "ranked" | "casual" | "tournament";

export interface GameMode {
  value: string;
  label: string;
  kind: ModeKind;
  maxParty: number;
  /** Comes and goes with patches or events. */
  rotating?: boolean;
}

const modeLists: Record<string, GameMode[]> = {
  valorant: [
    { value: "competitive", label: "Competitive", kind: "ranked", maxParty: 5 },
    { value: "premier", label: "Premier", kind: "tournament", maxParty: 5 },
    { value: "unrated", label: "Unrated", kind: "casual", maxParty: 5 },
    { value: "swiftplay", label: "Swiftplay", kind: "casual", maxParty: 5 },
    { value: "spike-rush", label: "Spike Rush", kind: "casual", maxParty: 5 },
  ],
  "league-of-legends": [
    { value: "ranked-solo-duo", label: "Ranked Solo/Duo", kind: "ranked", maxParty: 2 },
    { value: "ranked-flex", label: "Ranked Flex", kind: "ranked", maxParty: 5 },
    { value: "normal-draft", label: "Normal Draft", kind: "casual", maxParty: 5 },
    { value: "swiftplay", label: "Swiftplay", kind: "casual", maxParty: 5 },
    { value: "aram", label: "ARAM", kind: "casual", maxParty: 5 },
    { value: "aram-mayhem", label: "ARAM Mayhem", kind: "casual", maxParty: 5, rotating: true },
    { value: "arena", label: "Arena", kind: "casual", maxParty: 2, rotating: true },
    { value: "urf", label: "URF", kind: "casual", maxParty: 5, rotating: true },
    { value: "clash", label: "Clash", kind: "tournament", maxParty: 5, rotating: true },
  ],
  "counter-strike-2": [
    { value: "premier", label: "Premier", kind: "ranked", maxParty: 5 },
    { value: "competitive", label: "Competitive", kind: "ranked", maxParty: 5 },
    { value: "wingman", label: "Wingman", kind: "ranked", maxParty: 2 },
    { value: "casual", label: "Casual", kind: "casual", maxParty: 5 },
  ],
  "mobile-legends": [
    { value: "ranked", label: "Ranked", kind: "ranked", maxParty: 5 },
    { value: "classic", label: "Classic", kind: "casual", maxParty: 5 },
    { value: "brawl", label: "Brawl", kind: "casual", maxParty: 5 },
    { value: "custom", label: "Custom", kind: "casual", maxParty: 5 },
    { value: "arcade", label: "Arcade (rotating)", kind: "casual", maxParty: 5, rotating: true },
  ],
  "pubg-mobile": [
    { value: "ranked-squad", label: "Ranked Squad", kind: "ranked", maxParty: 4 },
    { value: "ranked-duo", label: "Ranked Duo", kind: "ranked", maxParty: 2 },
    { value: "classic-squad", label: "Classic Squad", kind: "casual", maxParty: 4 },
    { value: "classic-duo", label: "Classic Duo", kind: "casual", maxParty: 2 },
    { value: "team-deathmatch", label: "Team Deathmatch", kind: "casual", maxParty: 4 },
    { value: "ultimate-arena", label: "Ultimate Arena", kind: "casual", maxParty: 4 },
    { value: "payload", label: "Payload", kind: "casual", maxParty: 4 },
  ],
  "free-fire": [
    { value: "br-ranked-squad", label: "Battle Royale Ranked Squad", kind: "ranked", maxParty: 4 },
    { value: "br-ranked-duo", label: "Battle Royale Ranked Duo", kind: "ranked", maxParty: 2 },
    { value: "br-squad", label: "Battle Royale Squad", kind: "casual", maxParty: 4 },
    { value: "br-duo", label: "Battle Royale Duo", kind: "casual", maxParty: 2 },
    { value: "clash-squad-ranked", label: "Clash Squad Ranked", kind: "ranked", maxParty: 4 },
    { value: "clash-squad", label: "Clash Squad", kind: "casual", maxParty: 4 },
    { value: "lone-wolf", label: "Lone Wolf", kind: "casual", maxParty: 2 },
  ],
};

/** The group-play modes for a game, in the order they should be offered. */
export function modesFor(gameSlug: string): GameMode[] {
  return modeLists[gameSlug] ?? [];
}
