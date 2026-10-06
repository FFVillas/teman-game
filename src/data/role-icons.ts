/**
 * Role icons, in `public/roles/<game>/`. Valorant's are SVG, League of
 * Legends' are small WebP. Games with no roles (CS2, PUBG Mobile, Free Fire)
 * never reach this; Mobile Legends has roles but no art yet, so it shows text.
 *
 * Keys are the role names stored in `game_roles`.
 */
const icons: Record<string, Record<string, string>> = {
  valorant: {
    Duelist: "/roles/valorant/duelist.svg",
    Initiator: "/roles/valorant/initiator.svg",
    Sentinel: "/roles/valorant/sentinel.svg",
    Controller: "/roles/valorant/controller.svg",
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
