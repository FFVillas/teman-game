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
