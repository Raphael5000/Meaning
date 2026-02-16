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
    slug: "tips-and-tricks",
    label: "Tips & Tricks",
    description: "Power user techniques and advanced workflows.",
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
  // Getting Started
  {
    slug: "what-is-meaning",
    title: "What is Meaning?",
    description:
      "An introduction to Meaning — the AI-powered conversational interface for your Google Analytics data.",
    category: "getting-started",
    type: "article",
    readTime: "3 min read",
  },
  {
    slug: "creating-your-account",
    title: "Creating Your Account",
    description:
      "Step-by-step guide to signing up and setting up your Meaning account.",
    category: "getting-started",
    type: "guide",
    readTime: "4 min read",
  },
  {
    slug: "connecting-google-analytics",
    title: "Connecting Google Analytics",
    description:
      "How to connect your GA4 property to Meaning and start querying your data.",
    category: "getting-started",
    type: "guide",
    readTime: "5 min read",
  },
  {
    slug: "your-first-query",
    title: "Your First Query",
    description:
      "Ask your first question and learn how Meaning turns it into actionable insights.",
    category: "getting-started",
    type: "article",
    readTime: "3 min read",
  },

  // Google Analytics
  {
    slug: "understanding-ga4",
    title: "Understanding GA4",
    description:
      "A primer on Google Analytics 4 — events, properties, and how data is structured.",
    category: "google-analytics",
    type: "article",
    readTime: "7 min read",
  },
  {
    slug: "ga4-vs-universal-analytics",
    title: "GA4 vs Universal Analytics",
    description:
      "Key differences between GA4 and Universal Analytics, and what it means for your data.",
    category: "google-analytics",
    type: "article",
    readTime: "6 min read",
  },
  {
    slug: "setting-up-ga4-property",
    title: "Setting Up a GA4 Property",
    description:
      "How to create and configure a GA4 property for your website or app.",
    category: "google-analytics",
    type: "guide",
    readTime: "8 min read",
  },

  // Asking Questions
  {
    slug: "how-to-ask-effective-questions",
    title: "How to Ask Effective Questions",
    description:
      "Tips for phrasing your questions to get the best results from Meaning.",
    category: "asking-questions",
    type: "article",
    readTime: "4 min read",
  },
  {
    slug: "date-ranges-and-comparisons",
    title: "Date Ranges & Comparisons",
    description:
      "How to query specific time periods and compare performance across dates.",
    category: "asking-questions",
    type: "guide",
    readTime: "5 min read",
  },
  {
    slug: "follow-up-questions",
    title: "Follow-up Questions",
    description:
      "Use conversational context to drill deeper into your analytics data.",
    category: "asking-questions",
    type: "article",
    readTime: "3 min read",
  },

  // Metrics & Dimensions
  {
    slug: "pageviews-vs-sessions",
    title: "Pageviews vs Sessions",
    description:
      "Understand the difference between pageviews and sessions in GA4.",
    category: "metrics-and-dimensions",
    type: "article",
    readTime: "4 min read",
  },
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
    slug: "traffic-sources-explained",
    title: "Traffic Sources Explained",
    description:
      "Organic, direct, referral, social — learn what each traffic source means.",
    category: "metrics-and-dimensions",
    type: "article",
    readTime: "6 min read",
  },
  {
    slug: "user-engagement-metrics",
    title: "User Engagement Metrics",
    description:
      "Engaged sessions, engagement rate, and average engagement time demystified.",
    category: "metrics-and-dimensions",
    type: "article",
    readTime: "5 min read",
  },

  // Tips & Tricks
  {
    slug: "power-user-queries",
    title: "Power User Queries",
    description:
      "Advanced question patterns that unlock deeper insights from your data.",
    category: "tips-and-tricks",
    type: "guide",
    readTime: "6 min read",
  },
  {
    slug: "comparing-periods",
    title: "Comparing Time Periods",
    description:
      "How to compare week-over-week, month-over-month, and year-over-year performance.",
    category: "tips-and-tricks",
    type: "article",
    readTime: "4 min read",
  },

  // Use Cases
  {
    slug: "ecommerce-analytics",
    title: "E-commerce Analytics with Meaning",
    description:
      "How online stores use Meaning to track conversions, revenue, and product performance.",
    category: "use-cases",
    type: "article",
    readTime: "7 min read",
  },
  {
    slug: "content-marketing-insights",
    title: "Content Marketing Insights",
    description:
      "Using Meaning to measure content performance and find your best-performing articles.",
    category: "use-cases",
    type: "article",
    readTime: "5 min read",
  },
  {
    slug: "saas-dashboard-queries",
    title: "SaaS Dashboard Queries",
    description:
      "Common questions SaaS companies ask about user acquisition, retention, and engagement.",
    category: "use-cases",
    type: "guide",
    readTime: "6 min read",
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
