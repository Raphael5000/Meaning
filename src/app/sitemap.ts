import type { MetadataRoute } from "next";
import { getAllArticles } from "./docs/data";

const BASE_URL = "https://usemeaning.io";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/docs`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    // Feature pages
    { url: `${BASE_URL}/features/natural-language`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/real-time-analytics`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/email-alerts`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/team-collaboration`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/visualizations`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/automated-reports`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/dashboards`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/connectors`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/ai-insights`, changeFrequency: "monthly", priority: 0.7 },
    // Compare pages
    { url: `${BASE_URL}/compare/supermetrics`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/compare/looker-studio`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/compare/posthog`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/compare/databox`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/compare/whatagraph`, changeFrequency: "monthly", priority: 0.7 },
    // Landing pages
    { url: `${BASE_URL}/marketing-analytics-tools`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/marketing-dashboard`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/ppc-reporting`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/agency-reporting`, changeFrequency: "monthly", priority: 0.8 },
  ];

  const articles = await getAllArticles();

  const docPages: MetadataRoute.Sitemap = articles
    .filter((a) => a.section === "docs")
    .map((article) => ({
      url: `${BASE_URL}/docs/${article.category}/${article.slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

  const blogPages: MetadataRoute.Sitemap = articles
    .filter((a) => a.section === "blog")
    .map((article) => ({
      url: `${BASE_URL}/blog/${article.slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

  return [...staticPages, ...docPages, ...blogPages];
}
