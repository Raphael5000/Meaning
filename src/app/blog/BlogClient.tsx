"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import type { Article, Category } from "@/app/docs/data";

/* ------------------------------------------------------------------ */
/*  Search (Cmd+K)                                                     */
/* ------------------------------------------------------------------ */

function BlogSearch({ articles }: { articles: Article[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results =
    query.trim().length > 0
      ? articles
          .filter((a) => {
            const q = query.toLowerCase();
            return (
              a.title.toLowerCase().includes(q) ||
              a.description.toLowerCase().includes(q)
            );
          })
          .slice(0, 8)
      : [];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function navigate(article: Article) {
    setOpen(false);
    router.push(`/blog/${article.slug}`);
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
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
        style={{
          background: "var(--m-surface-elevated)",
          border: "1px solid var(--m-hairline)",
          color: "var(--m-text-muted)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        Search...
        <kbd
          className="hidden items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex"
          style={{
            background: "var(--m-bg)",
            border: "1px solid var(--m-hairline)",
          }}
        >
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl shadow-2xl"
            style={{ background: "var(--m-surface)", border: "1px solid var(--m-hairline)" }}
          >
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--m-hairline)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--m-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search blog posts..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--m-text)" }}
              />
              <kbd className="rounded px-1.5 py-0.5 text-xs" style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)", color: "var(--m-text-muted)" }}>ESC</kbd>
            </div>
            <div ref={listRef} className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {query.trim().length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--m-text-muted)" }}>Type to search blog posts</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--m-text-muted)" }}>No posts found for &ldquo;{query}&rdquo;</div>
              ) : (
                results.map((article, index) => (
                  <button key={article.slug} onClick={() => navigate(article)} onMouseEnter={() => setActiveIndex(index)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors" style={{ background: index === activeIndex ? "var(--m-surface-elevated)" : "transparent" }}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: index === activeIndex ? "var(--m-text)" : "var(--m-text-secondary)" }}>{article.title}</p>
                      <p className="mt-0.5 truncate text-xs" style={{ color: "var(--m-text-muted)" }}>{article.author}{article.readTime ? ` · ${article.readTime}` : ""}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(date?: Date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Blog landing                                                       */
/* ------------------------------------------------------------------ */

export function BlogClient({
  articles,
  categories,
}: {
  articles: Article[];
  categories: Category[];
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const featured = articles.filter((a) => a.featured);
  const displayed = activeCategory
    ? articles.filter((a) => a.category === activeCategory)
    : articles;
  const nonFeatured = activeCategory ? displayed : displayed.filter((a) => !a.featured);

  return (
    <div className="marketing min-h-screen" style={{ background: "var(--m-bg)" }}>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24 md:pt-40">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="display-lg text-[color:var(--m-text)]">Blog</h1>
          <BlogSearch articles={articles} />
        </div>

        {/* Category filter pills */}
        <div className="mb-10 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: activeCategory === null ? "var(--m-text)" : "transparent",
              color: activeCategory === null ? "var(--m-bg)" : "var(--m-text-secondary)",
              border: `1px solid ${activeCategory === null ? "var(--m-text)" : "var(--m-hairline)"}`,
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: activeCategory === cat.slug ? "var(--m-text)" : "transparent",
                color: activeCategory === cat.slug ? "var(--m-bg)" : "var(--m-text-secondary)",
                border: `1px solid ${activeCategory === cat.slug ? "var(--m-text)" : "var(--m-hairline)"}`,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Featured posts (only on "All") */}
        {!activeCategory && featured.length > 0 && (
          <div className={`mb-16 grid gap-6 ${featured.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {featured.slice(0, 2).map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl transition-colors"
                style={{ border: "1px solid var(--m-hairline)" }}
              >
                {/* Placeholder image area */}
                <div
                  className="flex aspect-[16/9] items-center justify-center"
                  style={{ background: "var(--m-surface-elevated)" }}
                >
                  <span className="text-sm" style={{ color: "var(--m-text-muted)" }}>
                    {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                  </span>
                </div>
                <div className="p-5">
                  <h2 className="mb-2 text-xl font-semibold" style={{ color: "var(--m-text)" }}>
                    {post.title}
                  </h2>
                  <p className="text-sm" style={{ color: "var(--m-text-muted)" }}>
                    {post.author && <>{post.author} · </>}
                    {formatDate(post.publishedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Latest Posts heading */}
        {nonFeatured.length > 0 && (
          <>
            <h2 className="mb-6 text-lg font-semibold" style={{ color: "var(--m-text)" }}>
              {activeCategory ? categories.find((c) => c.slug === activeCategory)?.label ?? "Posts" : "Latest Posts"}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {nonFeatured.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl transition-colors"
                  style={{ border: "1px solid var(--m-hairline)" }}
                >
                  <div
                    className="flex aspect-[16/10] items-center justify-center"
                    style={{ background: "var(--m-surface-elevated)" }}
                  >
                    <span className="text-xs" style={{ color: "var(--m-text-muted)" }}>
                      {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="mb-2 text-base font-semibold leading-snug" style={{ color: "var(--m-text)" }}>
                      {post.title}
                    </h3>
                    <p className="text-xs" style={{ color: "var(--m-text-muted)" }}>
                      {post.author && <>{post.author} · </>}
                      {formatDate(post.publishedAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {displayed.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-lg font-medium" style={{ color: "var(--m-text)" }}>
              No posts yet
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--m-text-muted)" }}>
              Check back soon — we&apos;re working on it.
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
