export interface UserMenuLink {
  label: string;
  href: string;
}

/**
 * Social used to sit in the navbar as its own icon, which left four icons
 * competing next to the lobby chip. It belongs here: it's a place you go
 * occasionally, not a status you watch — unlike notifications and messages,
 * which carry unread counts and stay in the bar.
 */
export const userMenuLinks: UserMenuLink[] = [
  { label: "My profile", href: "/profile/me" },
  { label: "Social", href: "/social" },
  { label: "Settings", href: "/settings" },
  { label: "Support", href: "/support" },
];

/** Staff accounts have no player profile — their menu points at the console. */
export const adminMenuLinks: UserMenuLink[] = [
  { label: "Admin console", href: "/admin" },
];

export const userMenuLegalLinks: UserMenuLink[] = [
  { label: "Terms and Services", href: "#" },
  { label: "Privacy Policy", href: "#" },
];
