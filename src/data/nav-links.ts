export interface NavLink {
  label: string;
  href: string;
  icon: string;
  iconWidth: number;
  iconHeight: number;
}

export const navLinks: NavLink[] = [
  { label: "LoL", href: "/lfg/valorant", icon: "/icons/nav-lol.svg", iconWidth: 15, iconHeight: 15 },
  { label: "Valorant", href: "/lfg/valorant", icon: "/icons/nav-valorant.svg", iconWidth: 15, iconHeight: 12 },
  { label: "CSGO 2", href: "/lfg/valorant", icon: "/icons/nav-csgo2.svg", iconWidth: 15, iconHeight: 15.75 },
  { label: "MLBB", href: "/lfg/valorant", icon: "/icons/nav-mlbb.svg", iconWidth: 15, iconHeight: 15 },
  { label: "Free Fire", href: "/lfg/valorant", icon: "/icons/nav-freefire.svg", iconWidth: 6.75, iconHeight: 15 },
  { label: "PUBG", href: "/lfg/valorant", icon: "/icons/nav-pubg.svg", iconWidth: 20.25, iconHeight: 15 },
];
