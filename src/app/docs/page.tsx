export const dynamic = "force-dynamic";

import { getAllArticles, categories, getFeaturedArticle } from "./data";
import DocsClient from "./DocsClient";

export default function DocsPage() {
  const articles = getAllArticles();
  return (
    <DocsClient
      articles={articles}
      categories={categories}
      featuredArticle={getFeaturedArticle(articles)}
    />
  );
}
