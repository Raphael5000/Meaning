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
    <nav className="flex flex-col" aria-label="Table of contents">
      <p
        className="mb-3 flex items-center gap-2 text-xs font-medium"
        style={{ color: "var(--m-text-muted)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        On this page
      </p>
      <ul className="flex flex-col gap-0.5">
        {headings.map(({ id, text, level }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(e) => handleClick(e, id)}
              className="block py-1 text-sm transition-colors"
              style={{
                paddingLeft: level === 3 ? "0.75rem" : undefined,
                color: activeId === id ? "var(--m-text)" : "var(--m-text-muted)",
                fontWeight: activeId === id ? 500 : 400,
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
