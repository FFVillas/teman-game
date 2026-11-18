/**
 * Role icons, in `public/roles/<game>/`. Valorant's are SVG, League of Legends'
 * and Mobile Legends' are small WebP. Games with no roles (CS2, PUBG Mobile,
 * Free Fire) never reach this — none of them defines official ones, so that is
 * a modelling decision, not missing art.
 *
 * Mobile Legends' are the game's own lane glyphs. They are a pale gradient on
 * a dark plate, so they sit quieter at 12px than Valorant's flat brand-blue
 * set; that is the official artwork, not a processing mistake.
 *
 * Keys are the role names stored in `game_role`.
 */
const icons: Record<string, Record<string, string>> = {
  valorant: {
    Duelist: "/roles/valorant/duelist.svg",
    Initiator: "/roles/valorant/initiator.svg",
    Sentinel: "/roles/valorant/sentinel.svg",
    Controller: "/roles/valorant/controller.svg",
  },
  "mobile-legends": {
    "Gold Lane": "/roles/mobile-legends/gold-lane.webp",
    "EXP Lane": "/roles/mobile-legends/exp-lane.webp",
    "Mid Lane": "/roles/mobile-legends/mid-lane.webp",
    Jungle: "/roles/mobile-legends/jungle.webp",
    Roam: "/roles/mobile-legends/roam.webp",
  },
  "league-of-legends": {
    Top: "/roles/league-of-legends/top.webp",
    Jungle: "/roles/league-of-legends/jungle.webp",
    Mid: "/roles/league-of-legends/mid.webp",
    "Bot (ADC)": "/roles/league-of-legends/bot.webp",
    Support: "/roles/league-of-legends/support.webp",
  },
};

export function roleIconFor(gameSlug: string, roleName: string) {
  return icons[gameSlug]?.[roleName];
}
