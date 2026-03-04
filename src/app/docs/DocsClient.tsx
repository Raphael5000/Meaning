"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import type { Article, Category } from "./data";

function TypeBadge({ type }: { type: Article["type"] }) {
  const config = {
    article: { label: "Article", bg: "rgba(16, 163, 127, 0.12)", color: "var(--accent)" },
    video: { label: "Video", bg: "rgba(99, 102, 241, 0.12)", color: "#818cf8" },
    guide: { label: "Guide", bg: "rgba(251, 191, 36, 0.12)", color: "#fbbf24" },
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

function DocsContent({
  articles,
  categories,
  featuredArticle,
}: {
  articles: Article[];
  categories: Category[];
  featuredArticle: Article | undefined;
}) {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Sync active category from URL (e.g. when opening /docs?category=... from breadcrumb)
  useEffect(() => {
    const category = searchParams.get("category");
    const valid =
      category && categories.some((c) => c.slug === category) ? category : null;
    setActiveCategory(valid);
  }, [searchParams, categories]);

  const displayedArticles = activeCategory
    ? articles.filter((a) => a.category === activeCategory)
    : featuredArticle
      ? articles.filter((a) => !a.featured)
      : articles;

  const activeLabel = activeCategory
    ? categories.find((c) => c.slug === activeCategory)?.label
    : "All Docs";

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
        <div
          className="absolute right-1/4 h-80 w-80 rounded-full opacity-[0.04] blur-3xl"
          style={{ top: "55%", background: "#6366f1" }}
        />
      </div>

      <Navbar />

      {/* Page Header */}
      <section className="relative z-10 px-4 pt-8 pb-6 sm:px-6 sm:pt-12 sm:pb-8">
        <div className="mx-auto max-w-7xl">
          <div
            className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs sm:mb-4 sm:px-4 sm:text-sm"
            style={{
              background: "rgba(16, 163, 127, 0.1)",
              border: "1px solid rgba(16, 163, 127, 0.3)",
              color: "var(--accent)",
            }}
          >
            Knowledge Centre
          </div>
          <h1
            className="mb-3 text-3xl font-bold sm:text-4xl md:text-5xl"
            style={{ color: "var(--text-primary)" }}
          >
            Docs
          </h1>
          <p
            className="max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Learn how to get the most out of Meaning and Google Analytics.
            Browse articles, guides, and tutorials to level up your analytics
            skills.
          </p>
        </div>
      </section>

      {/* Main Content: Sidebar + Articles */}
      <section className="relative z-10 px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:gap-8">
          {/* Left Sidebar */}
          <aside className="hidden w-64 shrink-0 md:block">
            <div
              className="sticky top-20 rounded-2xl p-4"
              style={{
                background:
                  "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <p
                className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Categories
              </p>
              <nav className="flex flex-col gap-1">
                <button
                  onClick={() => setActiveCategory(null)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                  style={{
                    background:
                      activeCategory === null
                        ? "rgba(16, 163, 127, 0.12)"
                        : "transparent",
                    color:
                      activeCategory === null
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  All Docs
                  <span
                    className="ml-auto text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {articles.length}
                  </span>
                </button>

                {categories.map((cat) => {
                  const count = articles.filter((a) => a.category === cat.slug).length;
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => setActiveCategory(cat.slug)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                      style={{
                        background:
                          activeCategory === cat.slug
                            ? "rgba(16, 163, 127, 0.12)"
                            : "transparent",
                        color:
                          activeCategory === cat.slug
                            ? "var(--accent)"
                            : "var(--text-secondary)",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={cat.icon} />
                      </svg>
                      {cat.label}
                      <span
                        className="ml-auto text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Mobile Category Selector */}
          <div className="flex w-full flex-wrap gap-2 md:mb-0 md:hidden">
            <button
              onClick={() => setActiveCategory(null)}
              className="rounded-full px-4 py-2 text-sm transition-colors"
              style={{
                background:
                  activeCategory === null
                    ? "rgba(16, 163, 127, 0.15)"
                    : "rgba(255,255,255,0.05)",
                color:
                  activeCategory === null
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                border: `1px solid ${activeCategory === null ? "rgba(16, 163, 127, 0.3)" : "var(--border-color)"}`,
              }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className="rounded-full px-4 py-2 text-sm transition-colors"
                style={{
                  background:
                    activeCategory === cat.slug
                      ? "rgba(16, 163, 127, 0.15)"
                      : "rgba(255,255,255,0.05)",
                  color:
                    activeCategory === cat.slug
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                  border: `1px solid ${activeCategory === cat.slug ? "rgba(16, 163, 127, 0.3)" : "var(--border-color)"}`,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Right Content Area */}
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-col gap-1 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
              <h2
                className="text-lg font-semibold sm:text-xl"
                style={{ color: "var(--text-primary)" }}
              >
                {activeLabel}
              </h2>
              <span
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {(activeCategory ? displayedArticles : articles).length}{" "}
                {(activeCategory ? displayedArticles : articles).length === 1
                  ? "article"
                  : "articles"}
              </span>
            </div>

            {/* Featured article card - only on All Docs when a featured article exists */}
            {!activeCategory && featuredArticle && (
              <Link
                href={`/docs/${featuredArticle.category}/${featuredArticle.slug}`}
                className="group relative mb-6 block overflow-hidden rounded-2xl transition-all duration-300"
                style={{
                  background:
                    "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(16, 163, 127, 0.4)";
                  e.currentTarget.style.boxShadow =
                    "var(--shadow-card-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div className="card-noise" aria-hidden />
                <div className="relative z-10 flex flex-col sm:flex-row">
                  <div className="relative h-48 w-full shrink-0 overflow-hidden sm:h-56 sm:w-80 md:h-64 md:w-96">
                    {featuredArticle.image ? (
                      <Image
                        src={featuredArticle.image}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 24rem"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(16, 163, 127, 0.15) 0%, rgba(16, 163, 127, 0.05) 100%)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <span className="text-sm">Featured</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-center p-5 sm:p-6 md:p-8">
                    <div className="mb-2 inline-flex items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          background: "rgba(16, 163, 127, 0.12)",
                          color: "var(--accent)",
                        }}
                      >
                        Featured
                      </span>
                      <TypeBadge type={featuredArticle.type} />
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {featuredArticle.readTime ?? featuredArticle.duration}
                      </span>
                    </div>
                    <h3
                      className="mb-2 text-xl font-semibold leading-tight sm:text-2xl"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {featuredArticle.title}
                    </h3>
                    <p
                      className="mb-4 text-sm leading-relaxed sm:text-base"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {featuredArticle.description}
                    </p>
                    <span
                      className="inline-flex items-center gap-1 text-sm font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      Read the guide
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {displayedArticles.map((article) => (
                <Link
                  key={`${article.category}-${article.slug}`}
                  href={`/docs/${article.category}/${article.slug}`}
                  className="group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 sm:p-6"
                  style={{
                    background:
                      "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(16, 163, 127, 0.4)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "var(--shadow-card-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div className="card-noise" aria-hidden />
                  <div className="relative z-10">
                    <div className="mb-3 flex items-center gap-2">
                      <TypeBadge type={article.type} />
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {article.readTime ?? article.duration}
                      </span>
                    </div>
                    <h3
                      className="mb-2 text-base font-semibold leading-snug"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {article.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {article.description}
                    </p>
                    <span
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      Read more
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
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
              className="h-6 w-auto invert dark:invert-0"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
            <Link href="/privacy" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Terms
            </Link>
            <span>Copyright &copy; 2026 - All rights reserved | A product by <a href="https://www.hivory.io" target="_blank" rel="noopener noreferrer" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>Hivory</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function DocsClient({
  articles,
  categories,
  featuredArticle,
}: {
  articles: Article[];
  categories: Category[];
  featuredArticle: Article | undefined;
}) {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <span style={{ color: "var(--text-muted)" }}>Loading...</span>
      </div>
    }>
      <DocsContent articles={articles} categories={categories} featuredArticle={featuredArticle} />
    </Suspense>
  );
}
