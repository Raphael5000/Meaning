"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { categories, articles, getArticlesByCategory } from "./data";
import type { Article } from "./data";

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

export default function ResourcesPage() {
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const displayedArticles = activeCategory
    ? getArticlesByCategory(activeCategory)
    : articles;

  const activeLabel = activeCategory
    ? categories.find((c) => c.slug === activeCategory)?.label
    : "All Resources";

  return (
    <div
      className="relative min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #050505 0%, #080a09 40%, rgba(16, 163, 127, 0.04) 100%)",
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

      {/* Navigation */}
      <nav className="relative z-50 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 sm:gap-4">
        <Link href="/" className="shrink-0">
          <Image
            src="/Logo.svg"
            alt="Meaning"
            width={120}
            height={42}
            className="h-8 w-auto sm:h-9"
            priority
          />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
          <Link
            href="/pricing"
            className="text-sm transition-colors"
            style={{
              color:
                pathname === "/pricing" ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            Pricing
          </Link>
          <Link
            href="/resources"
            className="text-sm transition-colors"
            style={{
              color:
                pathname?.startsWith("/resources")
                  ? "var(--accent)"
                  : "var(--text-secondary)",
            }}
          >
            Resources
          </Link>
          <Link
            href="/login"
            className="text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="shrink-0 rounded-[100px] px-4 py-1.5 text-sm font-medium transition-all duration-200 sm:px-5 sm:py-2"
            style={{
              background:
                "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)",
              color: "white",
            }}
          >
            Get started
          </Link>
        </div>
      </nav>

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
            Resources
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
                  "linear-gradient(145deg, rgba(20, 24, 23, 0.98) 0%, rgba(15, 22, 20, 0.99) 45%, rgba(16, 163, 127, 0.04) 100%)",
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
                  All Resources
                  <span
                    className="ml-auto text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {articles.length}
                  </span>
                </button>

                {categories.map((cat) => {
                  const count = getArticlesByCategory(cat.slug).length;
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
                {displayedArticles.length}{" "}
                {displayedArticles.length === 1 ? "article" : "articles"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedArticles.map((article) => (
                <Link
                  key={`${article.category}-${article.slug}`}
                  href={`/resources/${article.category}/${article.slug}`}
                  className="group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 sm:p-6"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(20, 24, 23, 0.98) 0%, rgba(15, 22, 20, 0.99) 45%, rgba(16, 163, 127, 0.04) 100%)",
                    border: "1px solid var(--border-color)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(16, 163, 127, 0.4)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 10px 40px rgba(0,0,0,0.3), 0 0 20px rgba(16, 163, 127, 0.1)";
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
              className="h-6 w-auto"
            />
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Copyright &copy; 2026 - All rights reserved | A product by Hivory
          </p>
        </div>
      </footer>
    </div>
  );
}
