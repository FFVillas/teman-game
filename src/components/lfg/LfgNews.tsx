import Link from "next/link";
import NewsCard from "./NewsCard";
import { lfgNews } from "@/data/lfg-news";

export default function LfgNews() {
  const featured = lfgNews.slice(0, 3);

  return (
    <div className="flex flex-col gap-10 pt-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-bold text-white sm:text-xl">
          Latest News
        </h2>
        <Link
          href="/lfg/valorant/news"
          className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-brand transition-opacity hover:opacity-80 sm:text-sm"
        >
          View All News
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/lfg-news-arrow.svg" alt="" className="h-2.5 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {featured.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
