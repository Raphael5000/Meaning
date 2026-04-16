"use client";

import Link from "next/link";
import type { Article, Category } from "./data";

function TypeBadge({ type }: { type: Article["type"] }) {
  const config = {
    article: { label: "Article", bg: "var(--m-surface-elevated)", color: "var(--m-text-secondary)" },
    video: { label: "Video", bg: "rgba(99, 102, 241, 0.08)", color: "#818cf8" },
    guide: { label: "Guide", bg: "rgba(251, 191, 36, 0.08)", color: "#d97706" },
  }[type];

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

export default function DocsClient({
  articles,
  categories,
  featuredArticle,
  sectionTitle,
  sectionDescription,
}: {
  articles: Article[];
  categories: Category[];
  featuredArticle: Article | undefined;
  sectionTitle?: string;
  sectionDescription?: string;
}) {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10 lg:px-12">
      {/* Breadcrumb */}
      <p className="mb-2 text-sm" style={{ color: "var(--m-text-muted)" }}>
        Documentation{sectionTitle ? ` / ${sectionTitle}` : ""}
      </p>

      {/* Title */}
      <h1 className="mb-3 text-3xl font-semibold tracking-tight" style={{ color: "var(--m-text)" }}>
        {sectionTitle || "Introduction"}
      </h1>
      <p className="mb-10 max-w-2xl text-base leading-relaxed" style={{ color: "var(--m-text-secondary)" }}>
        {sectionDescription || "Meaning is the AI analyst for your marketing stack. Browse articles, guides, and tutorials to get the most out of every connector."}
      </p>

      {/* Featured article */}
      {featuredArticle && (
        <Link
          href={`/docs/${featuredArticle.category}/${featuredArticle.slug}`}
          className="mb-10 block rounded-xl p-6 transition-colors hover:bg-[color:var(--m-surface-elevated)]"
          style={{ border: "1px solid var(--m-hairline)" }}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>
              Featured
            </span>
            <TypeBadge type={featuredArticle.type} />
          </div>
          <h3 className="mb-1 text-lg font-semibold" style={{ color: "var(--m-text)" }}>
            {featuredArticle.title}
          </h3>
          <p className="text-sm" style={{ color: "var(--m-text-secondary)" }}>
            {featuredArticle.description}
          </p>
        </Link>
      )}

      {/* Category sections */}
      {categories.map((cat) => {
        const catArticles = articles.filter((a) => a.category === cat.slug);
        if (catArticles.length === 0) return null;

        return (
          <section key={cat.slug} className="mb-10">
            <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--m-text)" }}>
              {cat.label}
            </h2>
            <p className="mb-4 text-sm" style={{ color: "var(--m-text-muted)" }}>
              {cat.description}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/docs/${article.category}/${article.slug}`}
                  className="group rounded-xl p-4 transition-colors hover:bg-[color:var(--m-surface-elevated)]"
                  style={{ border: "1px solid var(--m-hairline)" }}
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--m-surface-elevated)" }}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: "var(--m-text-muted)" }}
                    >
                      <path d={cat.icon} />
                    </svg>
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--m-text)" }}>
                    {article.title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
