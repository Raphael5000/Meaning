import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, getCategory, getArticlesByCategory, getArticlesBySection, docsCategories } from "../../data";
import { DocsSidebar } from "../../DocsSidebar";
import { TableOfContents } from "@/components/TableOfContents";
import { getArticleData } from "@/lib/mdx";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category: categorySlug, slug } = await params;
  const article = await getArticle(categorySlug, slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/docs/${categorySlug}/${slug}` },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;

  const article = await getArticle(categorySlug, slug);
  const category = getCategory(categorySlug);

  if (!article || !category) {
    return notFound();
  }

  const allDocsArticles = await getArticlesBySection("docs");
  const relatedArticles = allDocsArticles.filter(
    (a) => a.category === categorySlug && a.slug !== slug,
  );

  const { content: mdxContent, headings } = await getArticleData(slug);

  return (
    <div className="flex">
      <Suspense>
        <DocsSidebar articles={allDocsArticles} categories={docsCategories} />
      </Suspense>
      {/* Main content */}
      <div className="min-w-0 flex-1 px-8 py-10 lg:px-12">
        <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm" style={{ color: "var(--m-text-muted)" }}>
          <Link href="/docs" className="transition-colors hover:text-[color:var(--m-text-secondary)]">
            Documentation
          </Link>
          <span>/</span>
          <Link
            href={`/docs?category=${categorySlug}`}
            className="transition-colors hover:text-[color:var(--m-text-secondary)]"
          >
            {category.label}
          </Link>
        </div>

        {/* Article header */}
        <h1 className="mb-3 text-3xl font-semibold tracking-tight" style={{ color: "var(--m-text)" }}>
          {article.title}
        </h1>
        <p className="mb-8 text-base leading-relaxed" style={{ color: "var(--m-text-secondary)" }}>
          {article.description}
        </p>

        {/* Article body */}
        <div className="mb-16">
          {mdxContent ? (
            <div className="article-body">{mdxContent}</div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-xl py-16 text-center" style={{ border: "1px solid var(--m-hairline)" }}>
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "var(--m-surface-elevated)" }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--m-text-muted)" }}
                >
                  <path d={category.icon} />
                </svg>
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "var(--m-text)" }}>
                Content coming soon
              </h3>
              <p className="max-w-md text-sm" style={{ color: "var(--m-text-muted)" }}>
                This article is being written. Check back soon for the full
                content on &ldquo;{article.title}&rdquo;.
              </p>
            </div>
          )}
        </div>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--m-text)" }}>
              More in {category.label}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.slice(0, 3).map((related) => (
                <Link
                  key={related.slug}
                  href={`/docs/${related.category}/${related.slug}`}
                  className="rounded-xl p-4 transition-colors hover:bg-[color:var(--m-surface-elevated)]"
                  style={{ border: "1px solid var(--m-hairline)" }}
                >
                  <h3 className="mb-1 text-sm font-medium" style={{ color: "var(--m-text)" }}>
                    {related.title}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--m-text-muted)" }}>
                    {related.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Right sidebar — table of contents */}
      {headings.length > 0 && (
        <aside
          className="hidden w-56 shrink-0 xl:block"
          style={{ borderLeft: "1px solid var(--m-hairline)" }}
        >
          <div className="sticky top-12 px-4 py-10">
            <TableOfContents headings={headings} />
          </div>
        </aside>
      )}
    </div>
  );
}
