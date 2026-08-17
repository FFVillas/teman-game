export interface OAuthProvider {
  /** Matches the `provider` column on `connected_accounts` in the thesis ERD. */
  id: "discord" | "google";
  label: string;
  icon: string;
  iconWidth: number;
  iconHeight: number;
}

/**
 * Discord leads deliberately: 63.8% of survey respondents already
 * coordinate voice comms there, and lobbies are specced to carry a
 * Discord link. See docs/thesis-spec.md.
 */
export const oauthProviders: OAuthProvider[] = [
  {
    id: "discord",
    label: "Discord",
    icon: "/icons/social-discord.svg",
    iconWidth: 20,
    iconHeight: 16,
  },
  {
    id: "google",
    label: "Google",
    icon: "/icons/auth-google.svg",
    iconWidth: 18,
    iconHeight: 18,
  },
];

/** One card in the auth panel's card row. */
export interface AuthPanelCard {
  title: string;
  caption?: string;
  /** Required when the panel's badge mode is "icon". */
  icon?: string;
}

export interface AuthPanelContent {
  heading: string;
  description: string;
  cards: AuthPanelCard[];
  /** Index of the card to highlight; omit to render them evenly. */
  activeCard?: number;
  /**
   * "number" for a sequence the user works through, "icon" for parallel
   * items. Don't number things that aren't ordered — it implies steps.
   */
  badge: "number" | "icon";
}

/**
 * Signup shows the real onboarding sequence — the rank/role step maps to
 * `user_game_mapping` in the ERD, which the matchmaking score needs
 * before it can rank anything. See docs/thesis-spec.md.
 */
export const signupPanel: AuthPanelContent = {
  heading: "Get started with us",
  description: "Three quick steps and you're in a lobby.",
  badge: "number",
  activeCard: 0,
  cards: [
    { title: "Create your account", caption: "About a minute" },
    { title: "Add your games and rank", caption: "Sets your matches" },
    { title: "Join your first team", caption: "Browse open lobbies" },
  ],
};

export const loginPanel: AuthPanelContent = {
  heading: "Your squad is waiting",
  description: "Pick up right where you left off.",
  badge: "icon",
  cards: [
    {
      title: "Open lobbies",
      caption: "Filtered to your rank",
      icon: "/icons/auth-lobbies.svg",
    },
    {
      title: "Your reputation",
      caption: "Rated by teammates",
      icon: "/icons/auth-reputation.svg",
    },
    {
      title: "Pending invites",
      caption: "Answer in one tap",
      icon: "/icons/auth-invites.svg",
    },
  ],
};

export const authLegal = {
  termsLabel: "Terms of Service",
  termsHref: "#",
  privacyLabel: "Privacy Policy",
  privacyHref: "#",
};
