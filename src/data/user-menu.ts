export interface UserMenuLink {
  label: string;
  href: string;
}

export const userMenuLinks: UserMenuLink[] = [
  { label: "Account", href: "/profile/me" },
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
