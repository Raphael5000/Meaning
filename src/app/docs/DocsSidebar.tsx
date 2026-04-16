"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import type { Article, Category } from "./data";

/* ------------------------------------------------------------------ */
/*  Search                                                             */
/* ------------------------------------------------------------------ */

function DocsSearch({
  articles,
  categories,
}: {
  articles: Article[];
  categories: Category[];
}) {
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
              a.description.toLowerCase().includes(q) ||
              a.slug.toLowerCase().includes(q)
            );
          })
          .slice(0, 8)
      : [];

  const getCategoryLabel = useCallback(
    (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug,
    [categories],
  );

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
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
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
        <span className="flex-1 text-left">Search...</span>
        <kbd
          className="hidden items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex"
          style={{
            background: "var(--m-bg)",
            border: "1px solid var(--m-hairline)",
            color: "var(--m-text-muted)",
          }}
        >
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl shadow-2xl"
            style={{
              background: "var(--m-surface)",
              border: "1px solid var(--m-hairline)",
            }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid var(--m-hairline)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--m-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                style={{ color: "var(--m-text)" }}
              />
              <kbd
                className="rounded px-1.5 py-0.5 text-xs"
                style={{
                  background: "var(--m-surface-elevated)",
                  border: "1px solid var(--m-hairline)",
                  color: "var(--m-text-muted)",
                }}
              >
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {query.trim().length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--m-text-muted)" }}>
                  Type to search across all articles
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--m-text-muted)" }}>
                  No articles found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                results.map((article, index) => (
                  <button
                    key={article.slug}
                    onClick={() => navigate(article)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      background: index === activeIndex ? "var(--m-surface-elevated)" : "transparent",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" style={{ color: index === activeIndex ? "var(--m-text)" : "var(--m-text-muted)" }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: index === activeIndex ? "var(--m-text)" : "var(--m-text-secondary)" }}>
                        {article.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs" style={{ color: "var(--m-text-muted)" }}>
                        {getCategoryLabel(article.category)}
                        {article.readTime ? ` · ${article.readTime}` : ""}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {results.length > 0 && (
              <div
                className="flex items-center gap-4 px-4 py-2 text-xs"
                style={{ borderTop: "1px solid var(--m-hairline)", color: "var(--m-text-muted)" }}
              >
                <span className="flex items-center gap-1">
                  <kbd className="rounded px-1 py-0.5" style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}>↑</kbd>
                  <kbd className="rounded px-1 py-0.5" style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}>↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded px-1 py-0.5" style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}>↵</kbd>
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

/* ------------------------------------------------------------------ */
/*  Sidebar section (collapsible)                                      */
/* ------------------------------------------------------------------ */

function SidebarSection({
  category,
  articles,
  defaultOpen = false,
}: {
  category: Category;
  articles: Article[];
  defaultOpen?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(`/docs/${category.slug}`);
  const [open, setOpen] = useState(defaultOpen || isActive);

  // Auto-open when navigating into this section
  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[color:var(--m-surface-elevated)]"
        style={{ color: "var(--m-text)" }}
      >
        {category.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200"
          style={{
            color: "var(--m-text-muted)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <ul className="mt-1 flex flex-col gap-0.5 pl-3">
            {articles.map((article) => {
              const href = `/docs/${article.category}/${article.slug}`;
              const active = pathname === href;
              return (
                <li key={article.slug}>
                  <Link
                    href={href}
                    className="block rounded-md px-3 py-1.5 text-sm transition-colors"
                    style={{
                      color: active ? "var(--m-text)" : "var(--m-text-muted)",
                      fontWeight: active ? 500 : 400,
                      background: active ? "var(--m-surface-elevated)" : "transparent",
                    }}
                  >
                    {article.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main sidebar                                                       */
/* ------------------------------------------------------------------ */

export function DocsSidebar({
  articles,
  categories,
}: {
  articles: Article[];
  categories: Category[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section");

  // When on an article page, derive the active section from the URL
  const pathSection = pathname.match(/^\/docs\/([^/]+)\//)?.[1] ?? null;
  const currentSection = activeSection || pathSection;

  // Group articles by category, filtered to active section if set
  const grouped = categories
    .map((cat) => ({
      category: cat,
      articles: articles.filter((a) => a.category === cat.slug),
    }))
    .filter((g) => g.articles.length > 0)
    .filter((g) => !currentSection || g.category.slug === currentSection);

  return (
    <aside
      className="hidden w-60 shrink-0 md:block"
      style={{ borderRight: "1px solid var(--m-hairline)" }}
    >
      <div className="sticky top-12 flex h-[calc(100vh-3rem)] flex-col gap-4 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "thin" }}>
        {/* Search */}
        <DocsSearch articles={articles} categories={categories} />

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {/* Introduction / home link */}
          <Link
            href="/docs"
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              color: pathname === "/docs" ? "var(--m-text)" : "var(--m-text-muted)",
              background: pathname === "/docs" ? "var(--m-surface-elevated)" : "transparent",
            }}
          >
            Introduction
          </Link>

          {/* Category sections — flat list when viewing a specific section tab */}
          {grouped.length === 1 && currentSection ? (
            grouped[0].articles.map((article) => {
              const href = `/docs/${article.category}/${article.slug}`;
              const active = pathname === href;
              return (
                <Link
                  key={article.slug}
                  href={href}
                  className="block rounded-md px-3 py-1.5 text-sm transition-colors"
                  style={{
                    color: active ? "var(--m-text)" : "var(--m-text-muted)",
                    fontWeight: active ? 500 : 400,
                    background: active ? "var(--m-surface-elevated)" : "transparent",
                  }}
                >
                  {article.title}
                </Link>
              );
            })
          ) : (
            grouped.map(({ category, articles: catArticles }) => (
              <SidebarSection
                key={category.slug}
                category={category}
                articles={catArticles}
              />
            ))
          )}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme toggle at bottom */}
        <div className="pb-2" style={{ borderTop: "1px solid var(--m-hairline)", paddingTop: "0.75rem" }}>
          <ThemeSwitch />
        </div>
      </div>
    </aside>
  );
}
