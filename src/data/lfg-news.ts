export interface NewsArticle {
  id: string;
  date: string;
  readTime: string;
  title: string;
  excerpt: string;
  cover: string;
  href?: string;
}

export const lfgNews: NewsArticle[] = [
  {
    id: "news-1",
    date: "Jan 12, 2026",
    readTime: "5 min read",
    title: "VALORANT Patch 10.02 Update",
    excerpt:
      "Patch 10.02 shakes up the current meta with major agent balance changes and a fresh round of quality-of-life updates.",
    cover: "/lfg/news/valorant-patch-8.jpg",
  },
  {
    id: "news-2",
    date: "Jan 15, 2026",
    readTime: "3 min read",
    title: "VCT Champions 2026 Announced",
    excerpt:
      "VCT Champions 2026: the world's best teams gear up for the ultimate tactical shooter showdown of the year.",
    cover: "/lfg/news/vct-champions-2024.jpg",
  },
  {
    id: "news-3",
    date: "Feb 5, 2026",
    readTime: "8 min read",
    title: "Night Market: New Skins Available",
    excerpt:
      "Night Market is back! Grab your favorite weapon skins at a discounted price, running Feb 5 – Mar 2, 2026.",
    cover: "/lfg/news/night-market.jpg",
  },
];
