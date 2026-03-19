"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
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

// ---------------------------------------------------------------------------
// Search component
// ---------------------------------------------------------------------------

function DocsSearch({ articles, categories }: { articles: Article[]; categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = query.trim().length > 0
    ? articles.filter((a) => {
        const q = query.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q)
        );
      }).slice(0, 8)
    : [];

  const getCategoryLabel = useCallback(
    (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug,
    [categories]
  );

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function navigate(article: Article) {
    setOpen(false);
    router.push(`/docs/${article.category}/${article.slug}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      navigate(results[activeIndex]);
    }
  }

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          color: "var(--text-muted)",
          width: "100%",
          maxWidth: "360px",
        }}
      >
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
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="flex-1 text-left">Search docs...</span>
        <kbd
          className="hidden items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium sm:inline-flex"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-muted)",
          }}
        >
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]"
          style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
            }}
          >
            {/* Search input */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search articles..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              <kbd
                className="rounded-md px-1.5 py-0.5 text-xs"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="max-h-80 overflow-y-auto"
              style={{ scrollbarWidth: "thin" }}
            >
              {query.trim().length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Type to search across all articles
                  </p>
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    No articles found for &ldquo;{query}&rdquo;
                  </p>
                </div>
              ) : (
                results.map((article, index) => (
                  <button
                    key={article.slug}
                    onClick={() => navigate(article)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      background:
                        index === activeIndex
                          ? "rgba(16, 163, 127, 0.08)"
                          : "transparent",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={index === activeIndex ? "var(--accent)" : "var(--text-muted)"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 shrink-0"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        style={{
                          color: index === activeIndex ? "var(--accent)" : "var(--text-primary)",
                        }}
                      >
                        {article.title}
                      </p>
                      <p
                        className="mt-0.5 truncate text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {getCategoryLabel(article.category)}
                        {article.readTime ? ` · ${article.readTime}` : ""}
                      </p>
                    </div>
                    {index === activeIndex && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-1 shrink-0"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer hint */}
            {results.length > 0 && (
              <div
                className="flex items-center gap-4 px-4 py-2 text-xs"
                style={{
                  borderTop: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                }}
              >
                <span className="flex items-center gap-1">
                  <kbd className="rounded px-1 py-0.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>↑</kbd>
                  <kbd className="rounded px-1 py-0.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded px-1 py-0.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>↵</kbd>
                  open
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main docs content
// ---------------------------------------------------------------------------

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
            className="mb-3 text-3xl sm:text-4xl md:text-5xl"
            style={{ color: "var(--text-primary)" }}
          >
            Docs
          </h1>
          <p
            className="mb-5 max-w-2xl text-base leading-relaxed sm:mb-6 sm:text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Learn how to get the most out of Meaning and Google Analytics.
            Browse articles, guides, and tutorials to level up your analytics
            skills.
          </p>
          <DocsSearch articles={articles} categories={categories} />
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
                className="text-lg sm:text-xl"
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
                <div className="relative z-10">
                  <div className="p-5 sm:p-6 md:p-8">
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

      <Footer />
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
