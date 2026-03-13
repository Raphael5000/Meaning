import fs from "fs";
import path from "path";
import matter from "gray-matter";

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

const CONTENT_DIR = path.join(process.cwd(), "content", "docs");
const categorySlugs = new Set(categories.map((c) => c.slug));

export function getAllArticles(): Article[] {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

  return files.map((file) => {
    const slug = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    const { data } = matter(raw);

    if (
      process.env.NODE_ENV === "development" &&
      data.category &&
      !categorySlugs.has(data.category)
    ) {
      console.warn(
        `[docs] Unknown category "${data.category}" in ${file}. Known: ${[...categorySlugs].join(", ")}`
      );
    }

    return {
      slug,
      title: data.title ?? slug,
      description: data.description ?? "",
      category: data.category ?? "getting-started",
      type: data.type ?? "article",
      readTime: data.readTime,
      duration: data.duration,
      featured: data.featured,
    };
  });
}

export const articles: Article[] = getAllArticles();

export function getArticlesByCategory(categorySlug: string): Article[] {
  return articles.filter((a) => a.category === categorySlug);
}

export function getFeaturedArticle(articleList?: Article[]): Article | undefined {
  return (articleList ?? articles).find((a) => a.featured === true);
}

export function getArticle(
  categorySlug: string,
  articleSlug: string
): Article | undefined {
  return articles.find(
    (a) => a.category === categorySlug && a.slug === articleSlug
  );
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
