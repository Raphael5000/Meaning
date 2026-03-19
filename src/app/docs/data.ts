import { prisma } from "@/lib/prisma";

export interface Article {
  slug: string;
  title: string;
  description: string;
  category: string;
  type: "article" | "video" | "guide";
  readTime?: string;
  duration?: string;
  /** When true, shown as the main featured card on the docs landing (All Docs view). */
  featured?: boolean;
}

export interface Category {
  slug: string;
  label: string;
  description: string;
  icon: string; // SVG path data for a 24x24 viewBox
}

export const categories: Category[] = [
  {
    slug: "getting-started",
    label: "Getting Started",
    description: "Learn the basics of Meaning and set up your account.",
    icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  },
  {
    slug: "google-analytics",
    label: "Google Analytics",
    description: "Understand GA4 concepts, metrics, and dimensions.",
    icon: "M12 2a10 10 0 1 0 10 10H12V2z M20 12a8 8 0 0 0-8-8v8h8z",
  },
  {
    slug: "generative-search",
    label: "Generative Search",
    description: "Get the most out of natural language queries.",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
  {
    slug: "metrics-and-dimensions",
    label: "Metrics & Dimensions",
    description: "Deep dives into analytics metrics and what they mean.",
    icon: "M3 3v18h18 M18.7 8l-5.1 5.2-2.8-2.7L7 14.3",
  },
  {
    slug: "guides",
    label: "Guides",
    description: "Step-by-step guides and tutorials to help you master Meaning.",
    icon: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  },
  {
    slug: "use-cases",
    label: "Use Cases",
    description: "Real-world examples and success stories.",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  },
];

// ---------------------------------------------------------------------------
// In-memory cache for article metadata (refreshes every 60s)
// ---------------------------------------------------------------------------

const CACHE_TTL = 60_000; // 1 minute
let _articlesCache: Article[] | null = null;
let _articlesCacheTime = 0;

export async function getAllArticles(): Promise<Article[]> {
  const now = Date.now();
  if (_articlesCache && now - _articlesCacheTime < CACHE_TTL) {
    return _articlesCache;
  }

  const rows = await prisma.article.findMany({
    select: {
      slug: true,
      title: true,
      description: true,
      category: true,
      type: true,
      readTime: true,
      duration: true,
      featured: true,
    },
    orderBy: { publishedAt: "desc" },
  });

  _articlesCache = rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    description: r.description,
    category: r.category,
    type: r.type as Article["type"],
    readTime: r.readTime ?? undefined,
    duration: r.duration ?? undefined,
    featured: r.featured || undefined,
  }));
  _articlesCacheTime = now;

  return _articlesCache;
}

/** Call after publishing/updating an article to bust the cache immediately. */
export function invalidateArticlesCache() {
  _articlesCache = null;
  _articlesCacheTime = 0;
}

export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  const all = await getAllArticles();
  return all.filter((a) => a.category === categorySlug);
}

export async function getFeaturedArticle(articleList?: Article[]): Promise<Article | undefined> {
  const all = articleList ?? (await getAllArticles());
  return all.find((a) => a.featured === true);
}

export async function getArticle(
  categorySlug: string,
  articleSlug: string
): Promise<Article | undefined> {
  const all = await getAllArticles();
  return all.find((a) => a.category === categorySlug && a.slug === articleSlug);
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
