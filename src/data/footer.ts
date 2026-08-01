export interface FooterLink {
  label: string;
  href: string;
}

export interface SocialLink {
  label: string;
  href: string;
  icon: string;
  iconWidth: number;
  iconHeight: number;
  bg: string;
}

export const footerGameLinks: FooterLink[] = [
  { label: "League of Legends", href: "#" },
  { label: "Valorant", href: "#" },
  { label: "CSGO 2", href: "#" },
  { label: "Moible Legends: Ba..", href: "#" },
  { label: "Free Fire", href: "#" },
  { label: "PUBG: BATTLEGRO..", href: "#" },
];

export const footerCompanyLinks: FooterLink[] = [
  { label: "About Us", href: "#" },
  { label: "Tournaments", href: "#" },
  { label: "Community", href: "#" },
  { label: "Support", href: "#" },
];

export const socialLinks: SocialLink[] = [
  { label: "Discord", href: "#", icon: "/icons/social-discord.svg", iconWidth: 20, iconHeight: 16, bg: "bg-discord" },
  { label: "Twitter", href: "#", icon: "/icons/social-twitter.svg", iconWidth: 16, iconHeight: 16, bg: "bg-twitter" },
  { label: "Twitch", href: "#", icon: "/icons/social-twitch.svg", iconWidth: 16, iconHeight: 16, bg: "bg-twitch" },
];

export const legalLinks: FooterLink[] = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Cookie Policy", href: "#" },
];
