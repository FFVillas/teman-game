export interface NavLink {
  label: string;
  href: string;
  icon: string;
  iconWidth: number;
  iconHeight: number;
}

export const navLinks: NavLink[] = [
  { label: "LoL", href: "#", icon: "/icons/nav-lol.svg", iconWidth: 20, iconHeight: 20 },
  { label: "Valorant", href: "#", icon: "/icons/nav-valorant.svg", iconWidth: 20, iconHeight: 16 },
  { label: "CSGO 2", href: "#", icon: "/icons/nav-csgo2.svg", iconWidth: 20, iconHeight: 21 },
  { label: "MLBB", href: "#", icon: "/icons/nav-mlbb.svg", iconWidth: 20, iconHeight: 20 },
  { label: "Free Fire", href: "#", icon: "/icons/nav-freefire.svg", iconWidth: 9, iconHeight: 20 },
  { label: "PUBG", href: "#", icon: "/icons/nav-pubg.svg", iconWidth: 27, iconHeight: 20 },
];
