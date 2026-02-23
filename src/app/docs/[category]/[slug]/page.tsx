import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, getCategory, getArticlesByCategory } from "../../data";
import type { Article } from "../../data";
import { ArticlePageNav } from "./ArticlePageNav";
import { TableOfContents } from "@/components/TableOfContents";

function TypeBadge({ type }: { type: Article["type"] }) {
  const config = {
    article: {
      label: "Article",
      bg: "rgba(16, 163, 127, 0.12)",
      color: "var(--accent)",
    },
    video: {
      label: "Video",
      bg: "rgba(99, 102, 241, 0.12)",
      color: "#818cf8",
    },
    guide: {
      label: "Guide",
      bg: "rgba(251, 191, 36, 0.12)",
      color: "#fbbf24",
    },
  }[type];

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;

  const article = getArticle(categorySlug, slug);
  const category = getCategory(categorySlug);

  if (!article || !category) {
    return notFound();
  }

  const relatedArticles = getArticlesByCategory(categorySlug).filter(
    (a) => a.slug !== slug
  );

  const { getArticleContent, getArticleHeadings } = await import("@/lib/mdx");
  const [mdxContent, headings] = await Promise.all([
    getArticleContent(slug),
    getArticleHeadings(slug),
  ]);

  return (
    <div
      className="relative min-h-screen"
      style={{
        background:
          "var(--page-bg)",
      }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div
          className="absolute left-1/4 h-96 w-96 rounded-full opacity-[0.08] blur-3xl"
          style={{ top: "10%", background: "var(--accent)" }}
        />
      </div>

      <ArticlePageNav />

      {/* Main Content */}
      <section className="relative z-10 px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="min-w-0">
            {/* Breadcrumb */}
            <div className="mb-6 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-6 text-sm sm:mb-8 sm:pt-8">
              <Link
                href="/docs"
                className="shrink-0 transition-colors hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                Docs
              </Link>
              <span className="shrink-0" style={{ color: "var(--text-muted)" }}>/</span>
              <Link
                href={`/docs?category=${categorySlug}`}
                className="shrink-0 transition-colors hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                {category.label}
              </Link>
              <span className="shrink-0" style={{ color: "var(--text-muted)" }}>/</span>
              <span
                className="min-w-0 truncate"
                style={{ color: "var(--text-secondary)" }}
                title={article.title}
              >
                {article.title}
              </span>
            </div>

            {/* Article Header */}
            <div className="mb-8 sm:mb-10">
              <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4 sm:gap-3">
                <TypeBadge type={article.type} />
                <span
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {article.readTime ?? article.duration}
                </span>
              </div>
              <h1
                className="mb-3 text-2xl font-bold leading-tight sm:mb-4 sm:text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                {article.title}
              </h1>
              <p
                className="max-w-3xl text-base leading-relaxed sm:text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                {article.description}
              </p>
            </div>

            {/* Content + Right sidebar (Categories above Sign up) */}
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              {/* Article Body + Related */}
              <div className="min-w-0 flex-1">
                {/* Article Body: MDX or placeholder */}
                <div
                  className="mb-12 rounded-2xl p-4 sm:mb-16 sm:p-8 md:p-12"
                  style={{
                    background:
                      "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div className="relative z-10">
                    {mdxContent ? (
                      <div className="article-body max-w-3xl">{mdxContent}</div>
                    ) : (
                      <div
                        className="flex flex-col items-center gap-4 py-8 text-center sm:py-12"
                      >
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-full"
                          style={{
                            background: "rgba(16, 163, 127, 0.1)",
                            border: "2px solid rgba(16, 163, 127, 0.3)",
                          }}
                        >
                          <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ color: "var(--accent)" }}
                          >
                            <path d={category.icon} />
                          </svg>
                        </div>
                        <h3
                          className="text-xl font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Content coming soon
                        </h3>
                        <p
                          className="max-w-md text-sm leading-relaxed"
                          style={{ color: "var(--text-muted)" }}
                        >
                          This article is being written. Check back soon for the full
                          content on &ldquo;{article.title}&rdquo;.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                  <div>
                    <h2
                      className="mb-4 text-lg font-semibold sm:mb-6 sm:text-xl"
                      style={{ color: "var(--text-primary)" }}
                    >
                      More in {category.label}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {relatedArticles.slice(0, 3).map((related) => (
                        <Link
                          key={related.slug}
                          href={`/docs/${related.category}/${related.slug}`}
                          className="related-article-card group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 sm:p-6"
                          style={{
                            background:
                              "var(--card-bg)",
                            borderColor: "var(--border-color)",
                          }}
                        >
                          <div className="relative z-10">
                            <div className="mb-3 flex items-center gap-2">
                              <TypeBadge type={related.type} />
                              <span
                                className="text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {related.readTime ?? related.duration}
                              </span>
                            </div>
                            <h3
                              className="mb-2 text-base font-semibold leading-snug"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {related.title}
                            </h3>
                            <p
                              className="text-sm leading-relaxed"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {related.description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right sidebar: Table of contents above Sign up, sticky */}
              <aside className="hidden w-72 shrink-0 lg:block">
                <div className="sticky top-20 flex flex-col gap-4">
                  {/* Table of contents */}
                  {headings.length > 0 && (
                    <div
                      className="rounded-2xl p-4"
                      style={{
                        background:
                          "var(--card-bg)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <TableOfContents headings={headings} />
                    </div>
                  )}
                  {/* Sign up CTA card */}
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background:
                        "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <p
                      className="mb-2 text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Get more from your analytics
                    </p>
                    <p
                      className="mb-5 text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Join Meaning to turn your GA4 data into clear, actionable insights—no spreadsheets required.
                    </p>
                    <Link
                      href="/signup"
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200"
                      style={{
                        background:
                          "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)",
                        color: "white",
                      }}
                    >
                      Sign up to Meaning
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 px-4 py-6 sm:px-6 sm:py-8 md:px-12"
        style={{ borderTop: "1px solid var(--border-color)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <div className="flex items-center gap-2">
            <Image
              src="/Logo.svg"
              alt="Meaning"
              width={90}
              height={32}
              className="h-6 w-auto"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
            <Link href="/privacy" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Terms
            </Link>
            <span>Copyright &copy; 2026 - All rights reserved | A product by Hivory</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
