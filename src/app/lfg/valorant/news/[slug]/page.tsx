import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsCard from "@/components/lfg/NewsCard";
import { lfgNews } from "@/data/lfg-news";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

function getArticle(slug: string) {
  return lfgNews.find((article) => article.slug === slug);
}

export function generateStaticParams() {
  return lfgNews.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: `${article.title} — TemanGame`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const moreArticles = lfgNews
    .filter((item) => item.slug !== article.slug)
    .slice(0, 3);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col px-6 py-12">
          <Link
            href="/lfg/valorant/news"
            className="mb-5 flex w-fit items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src="/icons/lfg-back-arrow.svg" alt="" className="size-3.5" />
            Back to News
          </Link>

          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold text-white sm:text-2xl">
              {article.title}
            </h1>

            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/50">
              <span className="normal-case">{article.author}</span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>{article.date}</span>
              <span className="size-1 rounded-full bg-white/20" />
              <span className="normal-case">{article.readTime}</span>
            </div>
          </div>

          <div className="relative mt-6 h-[264px] w-full overflow-hidden rounded-2xl sm:h-[408px]">
            <Image
              src={article.cover}
              alt={article.title}
              fill
              sizes="1000px"
              priority
              className="object-cover"
            />
          </div>

          <article className="mt-8 flex flex-col gap-6">
            {article.body.map((section, index) => (
              <div key={index} className="flex flex-col gap-3">
                {section.heading && (
                  <h2 className="text-base font-bold text-white sm:text-lg">
                    {section.heading}
                  </h2>
                )}
                {section.paragraphs.map((paragraph, pIndex) => (
                  <p
                    key={pIndex}
                    className="text-sm leading-relaxed text-text-muted sm:text-[15px]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </article>

          {moreArticles.length > 0 && (
            <div className="mt-16 flex flex-col gap-8 border-t border-white/10 pt-10">
              <h2 className="text-lg font-bold text-white sm:text-xl">
                More News
              </h2>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                {moreArticles.map((item) => (
                  <NewsCard key={item.id} article={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
