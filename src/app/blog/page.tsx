export const dynamic = "force-dynamic";

import { getArticlesBySection, blogCategories } from "@/app/docs/data";
import { BlogClient } from "./BlogClient";

export default async function BlogPage() {
  const articles = await getArticlesBySection("blog");
  return <BlogClient articles={articles} categories={blogCategories} />;
}
