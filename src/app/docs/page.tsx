export const dynamic = "force-dynamic";

import { getAllArticles, categories, getFeaturedArticle } from "./data";
import DocsClient from "./DocsClient";

export default async function DocsPage() {
  const articles = await getAllArticles();
  return (
    <DocsClient
      articles={articles}
      categories={categories}
      featuredArticle={await getFeaturedArticle(articles)}
    />
  );
}
