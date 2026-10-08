import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArticleSection, NewsArticle } from "@/data/lfg-news";

/**
 * Reads `public.news` — the real table behind the LFG page's "Latest News"
 * row and the /news list + article pages. See 20261007000000_news.sql.
 */

interface NewsRow {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  cover: string;
  author: string;
  read_time: string | null;
  published_at: string;
  body: ArticleSection[];
}

const COLUMNS =
  "id, slug, category, title, excerpt, cover, author, read_time, published_at, body";

/** Matches the "Jan 12, 2026" format the article/card UI was built around. */
function formatPublishedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function rowToArticle(row: NewsRow): NewsArticle {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    date: formatPublishedDate(row.published_at),
    readTime: row.read_time ?? "",
    title: row.title,
    excerpt: row.excerpt,
    cover: row.cover,
    author: row.author,
    body: row.body,
  };
}

/** Newest first. Pass `gameId` to scope to one game's news feed. */
export async function fetchNews(
  supabase: SupabaseClient,
  gameId?: number,
): Promise<NewsArticle[]> {
  let query = supabase
    .from("news")
    .select(COLUMNS)
    .order("published_at", { ascending: false });

  if (gameId !== undefined) query = query.eq("game_id", gameId);

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as unknown as NewsRow[]).map(rowToArticle);
}

export async function fetchNewsArticle(
  supabase: SupabaseClient,
  slug: string,
): Promise<NewsArticle | null> {
  const { data, error } = await supabase
    .from("news")
    .select(COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return rowToArticle(data as unknown as NewsRow);
}
