"use client";

import { useEffect, useState } from "react";
import type { TocHeading } from "@/lib/mdx";

interface TableOfContentsProps {
  headings: TocHeading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const ids = headings.map((h) => h.id);
    const OFFSET = 100;

    const updateActiveId = () => {
      let current: string | null = null;
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= OFFSET) {
            current = ids[i];
            break;
          }
        }
      }
      setActiveId(current ?? ids[0]);
    };

    updateActiveId();
    // Listen on document with capture to catch scroll events from any
    // scrolling container (body, html, or nested elements).
    window.addEventListener("scroll", updateActiveId, { passive: true });
    document.addEventListener("scroll", updateActiveId, { passive: true, capture: true });

    return () => {
      window.removeEventListener("scroll", updateActiveId);
      document.removeEventListener("scroll", updateActiveId, { capture: true });
    };
  }, [headings]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (headings.length === 0) return null;

  return (
    <nav
      className="flex flex-col"
      aria-label="Table of contents"
    >
      <p
        className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        On this page
      </p>
      <ul className="flex flex-col gap-0.5">
        {headings.map(({ id, text }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(e) => handleClick(e, id)}
              className="block rounded-lg px-3 py-2 text-sm transition-colors"
              style={{
                color: activeId === id ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
