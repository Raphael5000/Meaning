"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";

const DOC_TABS = [
  {
    label: "Documentation",
    href: "/docs",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    label: "Chat",
    href: "/docs?section=ai-chat",
    match: "ai-chat",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Dashboards",
    href: "/docs?section=dashboards",
    match: "dashboards",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: "Connectors",
    href: "/docs?section=connectors",
    match: "connectors",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    label: "Alerts",
    href: "/docs?section=alerts",
    match: "alerts",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    label: "Teams",
    href: "/docs?section=teams",
    match: "teams",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export function DocsNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");

  function isTabActive(tab: (typeof DOC_TABS)[number]) {
    if (tab.exact) {
      return pathname === "/docs" && !section;
    }
    if (!tab.match) return false;
    return section === tab.match || pathname.includes(`/${tab.match}/`);
  }

  return (
    <header
      className="sticky top-0 z-40 flex h-12 items-center justify-between gap-4 px-5"
      style={{
        background: "var(--m-bg)",
        borderBottom: "1px solid var(--m-hairline)",
      }}
    >
      {/* Left — logo */}
      <Link href="/" className="shrink-0">
        <Image
          src="/Logo.svg"
          alt="Meaning"
          width={110}
          height={36}
          className="h-6 w-auto invert dark:invert-0"
        />
      </Link>

      {/* Centre — doc section tabs */}
      <nav className="hidden items-center gap-0.5 lg:flex">
        {DOC_TABS.map((tab) => {
          const active = isTabActive(tab);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors"
              style={{
                color: active ? "var(--m-text)" : "var(--m-text-muted)",
                fontWeight: active ? 500 : 400,
              }}
            >
              <span style={{ opacity: active ? 1 : 0.5 }}>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Right — actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="hidden text-sm sm:block"
          style={{ color: "var(--m-text-muted)" }}
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors"
          style={{
            background: "var(--m-text)",
            color: "var(--m-bg)",
          }}
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
