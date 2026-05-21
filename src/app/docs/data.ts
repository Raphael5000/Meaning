import { prisma } from "@/lib/prisma";

export interface Article {
  slug: string;
  title: string;
  description: string;
  section: "docs" | "blog";
  category: string;
  type: "article" | "video" | "guide";
  readTime?: string;
  duration?: string;
  featured?: boolean;
  author?: string;
  coverImage?: string;
  publishedAt?: Date;
}

export interface Category {
  slug: string;
  label: string;
  description: string;
  icon: string; // SVG path data for a 24x24 viewBox
}

/* ------------------------------------------------------------------ */
/*  Docs categories (platform-focused)                                 */
/* ------------------------------------------------------------------ */

export const docsCategories: Category[] = [
  {
    slug: "getting-started",
    label: "Getting Started",
    description: "Set up your account and connect your first data source.",
    icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  },
  {
    slug: "connectors",
    label: "Connectors",
    description: "Connect GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, Search Console, and Ahrefs.",
    icon: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  },
  {
    slug: "ai-chat",
    label: "AI Chat",
    description: "Ask questions in plain English across all your connected data.",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
  {
    slug: "dashboards",
    label: "Dashboards",
    description: "Build, customise, and share drag-and-drop dashboards.",
    icon: "M3 3v18h18 M18.7 8l-5.1 5.2-2.8-2.7L7 14.3",
  },
  {
    slug: "alerts",
    label: "Alerts",
    description: "Schedule AI-powered email reports on any cadence.",
    icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  },
  {
    slug: "teams",
    label: "Teams",
    description: "Manage roles, permissions, and billing across your organisation.",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
];

/* ------------------------------------------------------------------ */
/*  Blog categories (industry / thought-leadership)                    */
/* ------------------------------------------------------------------ */

export const blogCategories: Category[] = [
  {
    slug: "product",
    label: "Product",
    description: "Feature announcements, releases, and what we shipped.",
    icon: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  },
  {
    slug: "guides",
    label: "Guides",
    description: "Marketing analytics how-tos and best practices.",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  },
  {
    slug: "industry",
    label: "Industry",
    description: "Marketing trends, benchmarks, and insights.",
    icon: "M22 12h-4l-3 9L9 3l-3 9H2",
  },
  {
    slug: "company",
    label: "Company",
    description: "Team updates, milestones, and behind the scenes.",
    icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  },
];

// Keep a combined export for backward compat
export const categories: Category[] = [...docsCategories, ...blogCategories];

/* ------------------------------------------------------------------ */
/*  In-memory cache for article metadata (refreshes every 60s)         */
/* ------------------------------------------------------------------ */

const CACHE_TTL = 60_000;
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
      section: true,
      category: true,
      type: true,
      readTime: true,
      duration: true,
      featured: true,
      author: true,
      coverImage: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: "desc" },
  });

  _articlesCache = rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    description: r.description,
    section: (r.section ?? "docs") as Article["section"],
    category: r.category,
    type: r.type as Article["type"],
    readTime: r.readTime ?? undefined,
    duration: r.duration ?? undefined,
    featured: r.featured || undefined,
    author: r.author ?? undefined,
    coverImage: r.coverImage ?? undefined,
    publishedAt: r.publishedAt,
  }));
  _articlesCacheTime = now;

  return _articlesCache;
}

export function invalidateArticlesCache() {
  _articlesCache = null;
  _articlesCacheTime = 0;
}

export async function getArticlesBySection(section: "docs" | "blog"): Promise<Article[]> {
  const all = await getAllArticles();
  const filtered = all.filter((a) => a.section === section);
  // Sort overview/featured articles to the top of each category
  return filtered.sort((a, b) => {
    if (a.category !== b.category) return 0;
    if (a.slug.includes("overview") && !b.slug.includes("overview")) return -1;
    if (!a.slug.includes("overview") && b.slug.includes("overview")) return 1;
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });
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
  articleSlug: string,
): Promise<Article | undefined> {
  const all = await getAllArticles();
  return all.find((a) => a.category === categorySlug && a.slug === articleSlug);
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
