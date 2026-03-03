import { articles, categories, getFeaturedArticle } from "./data";
import DocsClient from "./DocsClient";

export default function DocsPage() {
  return (
    <DocsClient
      articles={articles}
      categories={categories}
      featuredArticle={getFeaturedArticle()}
    />
  );
}
