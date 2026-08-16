import Image from "next/image";
import Link from "next/link";
import type { NewsArticle } from "@/data/lfg-news";

export default function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <Link
      href={`/lfg/valorant/news/${article.slug}`}
      className="group flex flex-col gap-5"
    >
      <div className="relative min-h-[140px] w-full flex-1 overflow-hidden rounded-2xl shadow-lg">
        <Image
          src={article.cover}
          alt={article.title}
          fill
          sizes="(min-width: 640px) 33vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/50">
          <span>{article.date}</span>
          <span className="size-1 rounded-full bg-white/20" />
          <span className="normal-case">{article.readTime}</span>
        </div>
        <h3 className="text-sm font-bold text-white sm:text-base">
          {article.title}
        </h3>
        <p className="text-xs text-text-muted sm:text-sm">{article.excerpt}</p>
      </div>
    </Link>
  );
}
