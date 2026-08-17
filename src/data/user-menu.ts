export interface UserMenuLink {
  label: string;
  href: string;
}

export const userMenuLinks: UserMenuLink[] = [
  { label: "Account", href: "/profile/me" },
  { label: "Settings", href: "/settings" },
  { label: "Support", href: "/support" },
];

export const userMenuLegalLinks: UserMenuLink[] = [
  { label: "Terms and Services", href: "#" },
  { label: "Privacy Policy", href: "#" },
];
