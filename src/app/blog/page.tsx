import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog — Marketing Analytics Guides, Tips & Product Updates",
  description:
    "Guides, tips, and product updates from the Meaning team. Learn how to get more from your marketing data with AI-powered analytics.",
  alternates: { canonical: "/blog" },
};

import { getArticlesBySection, blogCategories } from "@/app/docs/data";
import { BlogClient } from "./BlogClient";

export default async function BlogPage() {
  const articles = await getArticlesBySection("blog");
  return <BlogClient articles={articles} categories={blogCategories} />;
}
