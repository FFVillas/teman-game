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

/**
 * Shown under the logo. The first paragraph is Riot's required wording for
 * products that use its properties (developer.riotgames.com/policies/general),
 * with our name in it; keep it verbatim. We are not a registered partner of any
 * publisher, so do not add "compliant" or "partner" claims here.
 */
export const footerDisclaimer: string[] = [
  "TemanGame isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.",
  "TemanGame is an independent student project and is also not affiliated with Valve, Moonton, Krafton or Garena. Their game names and artwork belong to their respective owners.",
];
