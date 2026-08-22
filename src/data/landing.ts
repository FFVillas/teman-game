/**
 * Landing page copy.
 *
 * Written for players, not for the thesis. Keep it plain: what the site is,
 * which game you play, how it works, why bother. Research findings, survey
 * percentages and the scoring formula belong in the proposal — a visitor
 * deciding whether to sign up doesn't need them.
 *
 * Also: no invented metrics ("10M+ gamers", "4.2k online"). There are no
 * users yet, and made-up numbers are the fastest way to look untrustworthy
 * on a site whose whole pitch is trust.
 */

export const heroContent = {
  title: "Find teammates worth playing with",
  description:
    "Pick your game, join a lobby that matches how you play, and see who you're teaming up with before the match starts.",
  gamesLabel: "Pick your game",
};

export interface Step {
  title: string;
  description: string;
}

export const howItWorks: Step[] = [
  {
    title: "Find a lobby",
    description:
      "Browse open lobbies for your game, filtered by rank, role, region and when you're free to play.",
  },
  {
    title: "Apply for your role",
    description:
      "Tell the leader what you'll play and why you fit. They accept, and you're in the lobby.",
  },
  {
    title: "Play, then rate each other",
    description:
      "After the session everyone rates their teammates — which is what makes the next lobby better than the last.",
  },
];

export interface ValuePoint {
  icon: string;
  iconWidth: number;
  iconHeight: number;
  title: string;
  description: string;
}

export const valuePoints: ValuePoint[] = [
  {
    icon: "/icons/feature-filters.svg",
    iconWidth: 20,
    iconHeight: 20,
    title: "Filter by what matters",
    description:
      "Rank, role, region and playstyle — so you end up with people who want the same kind of game you do.",
  },
  {
    icon: "/icons/feature-verified.svg",
    iconWidth: 25,
    iconHeight: 20,
    title: "Know who you're joining",
    description:
      "Every player carries a rating and behaviour history from past lobbies. Check it before you commit, not after.",
  },
  {
    icon: "/icons/feature-chat.svg",
    iconWidth: 25,
    iconHeight: 20,
    title: "Sort the plan out first",
    description:
      "Agree on roles and goals in lobby chat, and hop into voice together before anyone queues up.",
  },
];

export const finalCta = {
  title: "Ready to find your squad?",
  description:
    "Make an account, set your games and roles, and join your first lobby.",
  primaryCta: { label: "Create an account", href: "/signup" },
  secondaryCta: { label: "Browse lobbies", href: "/lfg/valorant" },
};
