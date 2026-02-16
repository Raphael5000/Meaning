"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getArticle,
  getCategory,
  getArticlesByCategory,
  categories,
} from "../../data";
import type { Article } from "../../data";

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

export default function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = use(params);

  const article = getArticle(categorySlug, slug);
  const category = getCategory(categorySlug);

  if (!article || !category) {
    return notFound();
  }

  const relatedArticles = getArticlesByCategory(categorySlug).filter(
    (a) => a.slug !== slug
  );

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
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4">
        <Link href="/">
          <Image
            src="/Logo.svg"
            alt="Meaning"
            width={120}
            height={42}
            className="w-auto"
            style={{ height: "36px" }}
            priority
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/pricing"
            className="text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            Pricing
          </Link>
          <Link
            href="/resources"
            className="text-sm transition-colors"
            style={{ color: "var(--accent)" }}
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
            className="rounded-[100px] px-5 py-2 text-sm font-medium transition-all duration-200"
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

      {/* Main Content */}
      <section className="relative z-10 px-6 pb-24">
        <div className="mx-auto flex max-w-7xl gap-8">
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
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/resources?category=${cat.slug}`}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                    style={{
                      background:
                        cat.slug === categorySlug
                          ? "rgba(16, 163, 127, 0.12)"
                          : "transparent",
                      color:
                        cat.slug === categorySlug
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
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Right Content */}
          <div className="flex-1">
            {/* Breadcrumb */}
            <div className="mb-8 flex items-center gap-2 pt-8 text-sm">
              <Link
                href="/resources"
                className="transition-colors hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                Resources
              </Link>
              <span style={{ color: "var(--text-muted)" }}>/</span>
              <Link
                href={`/resources?category=${categorySlug}`}
                className="transition-colors hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                {category.label}
              </Link>
              <span style={{ color: "var(--text-muted)" }}>/</span>
              <span style={{ color: "var(--text-secondary)" }}>
                {article.title}
              </span>
            </div>

            {/* Article Header */}
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <TypeBadge type={article.type} />
                <span
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {article.readTime ?? article.duration}
                </span>
              </div>
              <h1
                className="mb-4 text-3xl font-bold md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                {article.title}
              </h1>
              <p
                className="max-w-3xl text-lg leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {article.description}
              </p>
            </div>

            {/* Article Body Placeholder */}
            <div
              className="mb-16 rounded-2xl p-8 md:p-12"
              style={{
                background:
                  "linear-gradient(145deg, rgba(20, 24, 23, 0.98) 0%, rgba(15, 22, 20, 0.99) 45%, rgba(16, 163, 127, 0.04) 100%)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <div
                  className="flex flex-col items-center gap-4 py-12 text-center"
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
              </div>
            </div>

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div>
                <h2
                  className="mb-6 text-xl font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  More in {category.label}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedArticles.slice(0, 3).map((related) => (
                    <Link
                      key={related.slug}
                      href={`/resources/${related.category}/${related.slug}`}
                      className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
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
                        e.currentTarget.style.borderColor =
                          "var(--border-color)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div className="card-noise" aria-hidden />
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
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 px-6 py-8 md:px-12"
        style={{ borderTop: "1px solid var(--border-color)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
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
