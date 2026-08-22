import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsCard from "@/components/lfg/NewsCard";
import { lfgNews } from "@/data/lfg-news";

export const metadata: Metadata = {
  title: "Latest News — TemanGame",
  description:
    "Patch notes, esports announcements, and platform updates for Valorant teams on TemanGame.",
};

export default function LfgNewsIndexPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-8 px-6 py-12">
          <Link
            href="/lfg/valorant"
            className="flex w-fit items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img src="/icons/lfg-back-arrow.svg" alt="" className="size-3.5" />
            Back to lobbies
          </Link>

          <div className="flex flex-col gap-3">
            <h1 className="text-xl font-extrabold text-white sm:text-2xl">
              Latest News
            </h1>
            <p className="max-w-2xl text-sm text-text-muted sm:text-base">
              Patch notes, esports announcements, and platform updates for
              Valorant teams on TemanGame.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {lfgNews.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
