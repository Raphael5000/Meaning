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
  /** Image URL for the featured card. Used when featured is true. */
  image?: string;
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
  {
    slug: "ga4-key-events-conversions-guide",
    title: "GA4 Key Events Explained: The Complete Guide to Conversions in Google Analytics 4",
    description:
      "Learn what GA4 key events are, how they differ from conversions, and how to set them up. A practical guide to tracking what matters in Google Analytics 4.",
    category: "google-analytics",
    type: "article",
    readTime: "10 min read",
  },
  {
    slug: "what-is-geo-generative-engine-optimisation",
    title: "What Is Generative Engine Optimisation (GEO)? A Plain-English Guide for Business Owners",
    description:
      "Generative Engine Optimisation (GEO) helps your business appear in AI-powered search answers. Learn what GEO is, how it differs from SEO, and 5 steps to start.",
    category: "generative-search",
    type: "guide",
    readTime: "14 min read",
  },
  {
    slug: "9-techniques-boost-ai-search-visibility",
    title: "9 Proven Techniques That Boost AI Search Visibility by 40%",
    description:
      "Princeton researchers tested 9 content optimisation techniques for AI search engines. Three methods delivered 30-40% visibility gains. Here's exactly how to implement each one.",
    category: "generative-search",
    type: "guide",
    readTime: "16 min read",
  },
  {
    slug: "how-to-structure-content-for-ai-citations",
    title: "How to Structure Your Content So AI Engines Actually Cite You",
    description:
      "Learn the exact content structures AI engines prefer to cite — definition blocks, self-contained paragraphs, comparison tables, and more. Practical before-and-after examples included.",
    category: "generative-search",
    type: "guide",
    readTime: "18 min read",
  },
  {
    slug: "entity-clarity-why-ai-cant-recommend-you",
    title: "Entity Clarity: Why AI Can't Recommend You If It Doesn't Understand What You Do",
    description:
      "AI systems need to understand what your brand is before they can recommend it. Learn how entity clarity, consistent descriptions, and schema markup help you appear in AI-generated answers.",
    category: "generative-search",
    type: "article",
    readTime: "12 min read",
  },
  {
    slug: "co-citations-brand-mentions-ai-search",
    title: "Co-Citations and Brand Mentions: The New Backlinks for AI Search",
    description:
      "Brand mentions now correlate 3x more strongly with AI visibility than backlinks. Learn how co-citations, review signals, and brand presence drive AI search recommendations — with a practical audit framework.",
    category: "generative-search",
    type: "article",
    readTime: "14 min read",
  },
  {
    slug: "tracking-geo-performance-metrics",
    title: "Tracking Your GEO Performance: Metrics That Actually Matter",
    description:
      "Learn how to measure AI search visibility when traditional CTR no longer tells the full story. Discover the GEO metrics, tools, and GA4 techniques that track your performance in AI Overviews, ChatGPT, and Perplexity.",
    category: "generative-search",
    type: "guide",
    readTime: "11 min read",
  },
  {
    slug: "schema-markup-structured-data-generative-search",
    title: "Schema Markup and Structured Data for Generative Search: The Complete Guide",
    description:
      "Learn how schema markup and structured data help AI engines understand, trust, and cite your content. Complete JSON-LD examples, implementation checklist, and the tools you need for GEO success.",
    category: "generative-search",
    type: "guide",
    readTime: "16 min read",
    featured: true,
    image: "/docs/featured-placeholder.svg",
  },
];

export function getArticlesByCategory(categorySlug: string): Article[] {
  return articles.filter((a) => a.category === categorySlug);
}

export function getFeaturedArticle(): Article | undefined {
  return articles.find((a) => a.featured === true);
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
