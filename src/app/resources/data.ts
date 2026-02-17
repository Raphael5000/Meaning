export interface Article {
  slug: string;
  title: string;
  description: string;
  category: string;
  type: "article" | "video" | "guide";
  readTime?: string;
  duration?: string;
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
    slug: "asking-questions",
    label: "Asking Questions",
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

export const articles: Article[] = [
  {
    slug: "understanding-bounce-rate",
    title: "Understanding Bounce Rate",
    description:
      "What bounce rate means in GA4 and how it differs from Universal Analytics.",
    category: "metrics-and-dimensions",
    type: "article",
    readTime: "5 min read",
  },
  {
    slug: "sessions-vs-users-ga4",
    title: "Sessions vs Users in GA4",
    description:
      "Understand the difference between sessions and users in Google Analytics 4. Learn when to use each metric, how GA4 counts them, and practical examples.",
    category: "metrics-and-dimensions",
    type: "article",
    readTime: "8 min read",
  },
  {
    slug: "utm-parameters-ga4-guide",
    title: "UTM Parameters in Google Analytics 4: The Complete Guide",
    description:
      "Learn how UTM parameters work in GA4. Covers utm_source, utm_medium, utm_campaign and more — with examples, naming conventions, and common mistakes to avoid.",
    category: "guides",
    type: "guide",
    readTime: "12 min read",
  },
];

export function getArticlesByCategory(categorySlug: string): Article[] {
  return articles.filter((a) => a.category === categorySlug);
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
