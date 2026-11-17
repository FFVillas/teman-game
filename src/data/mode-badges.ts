/**
 * Shorter names for the lobby card's mode badge, which sits on a 128px-wide
 * cover and must stay on one line. Only modes whose full name doesn't fit are
 * listed; everywhere else (the lobby page, the form) shows the full name.
 * Keyed by `game_modes.value`.
 */
const shortNames: Record<string, string> = {
  "ranked-solo-duo": "Solo/Duo",
  "team-deathmatch": "TDM",
  "ultimate-arena": "Arena",
  "classic-squad": "Squad",
  arcade: "Arcade",
  "clash-squad-ranked": "CS Ranked",
  "br-duo": "BR Duo",
  "br-squad": "BR Squad",
  "br-ranked-duo": "Ranked Duo",
  "br-ranked-squad": "Ranked Squad",
};

export function modeBadgeLabel(value: string | undefined, label: string): string {
  return (value && shortNames[value]) ?? label;
}
