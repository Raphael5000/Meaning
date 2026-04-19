export const revalidate = 60;

import { getArticlesBySection, docsCategories } from "./data";
import { DocsSidebar } from "./DocsSidebar";
import DocsClient from "./DocsClient";

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const articles = await getArticlesBySection("docs");

  // Filter articles and categories when a section tab is selected
  const activeCategory = section
    ? docsCategories.find((c) => c.slug === section)
    : null;
  const filteredArticles = activeCategory
    ? articles.filter((a) => a.category === activeCategory.slug)
    : articles;
  const filteredCategories = activeCategory
    ? [activeCategory]
    : docsCategories;
  const featuredArticle = filteredArticles.find((a) => a.featured);

  return (
    <div className="flex">
      <DocsSidebar articles={articles} categories={docsCategories} />
      <main className="min-w-0 flex-1">
        <DocsClient
          articles={filteredArticles}
          categories={filteredCategories}
          featuredArticle={featuredArticle}
          sectionTitle={activeCategory?.label}
          sectionDescription={activeCategory?.description}
        />
      </main>
    </div>
  );
}
