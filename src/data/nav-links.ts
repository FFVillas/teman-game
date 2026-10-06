export interface NavLink {
  label: string;
  /** Matches `games.slug`; the link goes to that game's LFG page. */
  slug: string;
  href: string;
  icon: string;
  iconWidth: number;
  iconHeight: number;
}

function gameLink(
  label: string,
  slug: string,
  icon: string,
  iconWidth: number,
  iconHeight: number,
): NavLink {
  return { label, slug, href: `/lfg/${slug}`, icon, iconWidth, iconHeight };
}

export const navLinks: NavLink[] = [
  gameLink("LoL", "league-of-legends", "/icons/nav-lol.svg", 15, 15),
  gameLink("Valorant", "valorant", "/icons/nav-valorant.svg", 15, 12),
  gameLink("CSGO 2", "counter-strike-2", "/icons/nav-csgo2.svg", 15, 15.75),
  gameLink("MLBB", "mobile-legends", "/icons/nav-mlbb.svg", 15, 15),
  gameLink("Free Fire", "free-fire", "/icons/nav-freefire.svg", 6.75, 15),
  gameLink("PUBG", "pubg-mobile", "/icons/nav-pubg.svg", 20.25, 15),
];

/** The nav entry for a game slug, e.g. for its icon on the LFG page. */
export function navLinkFor(slug: string): NavLink | undefined {
  return navLinks.find((link) => link.slug === slug);
}
