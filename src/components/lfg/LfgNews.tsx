import Image from "next/image";
import { lfgNews } from "@/data/lfg-news";

export default function LfgNews() {
  return (
    <div className="flex flex-col gap-10 pt-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-bold text-white sm:text-xl">
          Latest News
        </h2>
        <a
          href="#"
          className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-brand transition-opacity hover:opacity-80 sm:text-sm"
        >
          View All News
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/lfg-news-arrow.svg" alt="" className="h-2.5 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {lfgNews.map((article) => (
          <article key={article.id} className="flex flex-col gap-5">
            <div className="relative h-[165px] w-full overflow-hidden rounded-2xl shadow-lg">
              <Image
                src={article.cover}
                alt={article.title}
                fill
                sizes="(min-width: 640px) 33vw, 100vw"
                className="object-cover"
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
              <p className="text-xs text-text-muted sm:text-sm">
                {article.excerpt}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
