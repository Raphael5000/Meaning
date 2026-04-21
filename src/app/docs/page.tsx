import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Learn how to connect your data sources, build dashboards, set up alerts, and get the most out of Meaning.",
  alternates: { canonical: "/docs" },
};

import { Suspense } from "react";
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
      <Suspense>
        <DocsSidebar articles={articles} categories={docsCategories} />
      </Suspense>
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
