import type { MetadataRoute } from "next";
import { articles } from "./docs/data";

const BASE_URL = "https://usemeaning.io";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/docs`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/features/natural-language`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/real-time-analytics`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/email-alerts`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/team-collaboration`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/visualizations`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/automated-reports`, changeFrequency: "monthly", priority: 0.7 },
  ];

  const docPages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/docs/${article.category}/${article.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...docPages];
}
