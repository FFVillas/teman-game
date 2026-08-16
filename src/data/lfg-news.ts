export interface ArticleSection {
  heading?: string;
  paragraphs: string[];
}

export interface NewsArticle {
  id: string;
  slug: string;
  category: string;
  date: string;
  readTime: string;
  title: string;
  excerpt: string;
  cover: string;
  author: string;
  body: ArticleSection[];
}

export const lfgNews: NewsArticle[] = [
  {
    id: "news-1",
    slug: "valorant-patch-10-02-update",
    category: "Patch Notes",
    date: "Jan 12, 2026",
    readTime: "5 min read",
    title: "VALORANT Patch 10.02 Update",
    excerpt:
      "Patch 10.02 shakes up the current meta with major agent balance changes and a fresh round of quality-of-life updates.",
    cover: "/lfg/news/valorant-patch-8.jpg",
    author: "TemanGame Staff",
    body: [
      {
        paragraphs: [
          "Patch 10.02 is live, and it's one of the bigger balance passes we've shipped this act. The headline changes target Duelists that have been dominating pick rates in Ranked and Premier, while Sentinels and Controllers pick up small buffs to keep site retakes competitive.",
          "As always, these numbers are tuned from aggregate data across all ranks — expect follow-up micro-adjustments in 10.03 once the meta settles.",
        ],
      },
      {
        heading: "Duelist Adjustments",
        paragraphs: [
          "Iso's Kill Contract shield duration reduced from 5.75s to 5s, and the double-kill activation cooldown increased by 10 seconds. We've heard the feedback that a single successful engage was providing too much sustained value across a round.",
          "Raze's Blast Pack self-damage window shortened slightly, making satchel jumps a little less punishing for aggressive entries.",
        ],
      },
      {
        heading: "Sentinel Adjustments",
        paragraphs: [
          "Killjoy's Nanoswarm grenade cost reduced from 400 to 300 credits, making it easier to fully kit up on eco rounds.",
          "Cypher's Spycam reveal duration on trip increased by 1 second, giving info-focused Sentinels a bit more warning on flanks.",
        ],
      },
      {
        heading: "Controller Adjustments",
        paragraphs: [
          "Harbor's Cove now blocks footstep audio in addition to vision, matching player expectations from testing on the PBE.",
          "Minor bug fixes: Omen's Shrouded Step no longer occasionally fails to teleport when cast near destructible geometry.",
        ],
      },
    ],
  },
  {
    id: "news-2",
    slug: "vct-champions-2026-announced",
    category: "Esports",
    date: "Jan 15, 2026",
    readTime: "3 min read",
    title: "VCT Champions 2026 Announced",
    excerpt:
      "VCT Champions 2026: the world's best teams gear up for the ultimate tactical shooter showdown of the year.",
    cover: "/lfg/news/vct-champions-2024.jpg",
    author: "TemanGame Staff",
    body: [
      {
        paragraphs: [
          "The road to Champions 2026 is set. Twenty teams from every region will battle through the Kickoff, Stage 1, and Stage 2 circuits for a shot at the year's biggest trophy, with the finals capping off the international season this fall.",
        ],
      },
      {
        heading: "What's New This Year",
        paragraphs: [
          "A revised group-stage format cuts down on dead rubber matches by seeding playoff brackets earlier, so every map in the group stage carries real stakes.",
          "The broadcast crew is expanding its talent roster with more regional analysts joining the international desk, aiming to bring more local flavor to the global feed.",
        ],
      },
      {
        heading: "How to Follow Along",
        paragraphs: [
          "Matches will stream on the usual channels, and in-client drops return for viewers who tune in during the group stage. We'll post the full bracket and schedule here as soon as regional qualifiers wrap up.",
        ],
      },
    ],
  },
  {
    id: "news-3",
    slug: "night-market-new-skins-available",
    category: "Store",
    date: "Feb 5, 2026",
    readTime: "8 min read",
    title: "Night Market: New Skins Available",
    excerpt:
      "Night Market is back! Grab your favorite weapon skins at a discounted price, running Feb 5 – Mar 2, 2026.",
    cover: "/lfg/news/night-market.jpg",
    author: "TemanGame Staff",
    body: [
      {
        paragraphs: [
          "Night Market has opened its doors for another round. From February 5th through March 2nd, log in to unlock six random offers pulled from your personal catalog of skins you don't already own — each one discounted below its usual store price.",
        ],
      },
      {
        heading: "How It Works",
        paragraphs: [
          "Every player gets a unique set of six offers, so no two accounts will see the same deals. Offers are locked in the moment the market opens for you and won't refresh until the next Night Market event.",
          "Bundles and premium editions are excluded — Night Market offers are always single weapon skins, discounted between 10% and 40% off.",
        ],
      },
      {
        heading: "Our Picks",
        paragraphs: [
          "If you're short on VP, prioritize skins with animated finishers and finisher variants — they tend to hold the steepest discounts relative to their original price. Check your in-client Night Market tab now before offers rotate out on March 2nd.",
        ],
      },
    ],
  },
];
