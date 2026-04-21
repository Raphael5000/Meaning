"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";

const DOC_TABS = [
  {
    label: "Documentation",
    href: "/docs",
    exact: true,
    iconClass: "docs-icon-book",
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
    iconClass: "nav-icon-chat",
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
    iconClass: "nav-icon-grid",
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
    iconClass: "nav-icon-layers",
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
    iconClass: "nav-icon-bell",
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
    iconClass: "nav-icon-users",
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, section]);

  function isTabActive(tab: (typeof DOC_TABS)[number]) {
    if (tab.exact) {
      return pathname === "/docs" && !section;
    }
    if (!tab.match) return false;
    return section === tab.match || pathname.includes(`/${tab.match}/`);
  }

  return (
    <>
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

        {/* Centre — doc section tabs (desktop) */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {DOC_TABS.map((tab) => {
            const active = isTabActive(tab);
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className="group inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors hover:bg-[rgba(128,128,128,0.06)]"
                style={{
                  color: active ? "var(--m-text)" : "var(--m-text-muted)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <span
                  className={tab.iconClass}
                  style={{ opacity: active ? 1 : 0.5 }}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right — actions + hamburger */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden text-sm sm:block"
            style={{ color: "var(--m-text-muted)" }}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="btn-primary rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors"
          >
            Get Started
          </Link>

          {/* Hamburger — visible only on mobile */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-[rgba(128,128,128,0.1)] lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <div className="relative h-4 w-5">
              <span
                className="absolute left-0 h-[1.5px] w-full rounded-full transition-all duration-300 ease-in-out"
                style={{
                  background: "var(--m-text)",
                  top: mobileOpen ? "50%" : "0",
                  transform: mobileOpen
                    ? "translateY(-50%) rotate(45deg)"
                    : "none",
                }}
              />
              <span
                className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rounded-full transition-all duration-300 ease-in-out"
                style={{
                  background: "var(--m-text)",
                  opacity: mobileOpen ? 0 : 1,
                  transform: mobileOpen
                    ? "translateY(-50%) scaleX(0)"
                    : "translateY(-50%) scaleX(1)",
                }}
              />
              <span
                className="absolute left-0 h-[1.5px] w-full rounded-full transition-all duration-300 ease-in-out"
                style={{
                  background: "var(--m-text)",
                  bottom: mobileOpen ? "auto" : "0",
                  top: mobileOpen ? "50%" : "auto",
                  transform: mobileOpen
                    ? "translateY(-50%) rotate(-45deg)"
                    : "none",
                }}
              />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-[39] flex flex-col overflow-y-auto lg:hidden"
          style={{
            top: 48,
            background: "var(--m-bg)",
            borderTop: "1px solid var(--m-hairline)",
          }}
        >
          <nav className="flex flex-col gap-1 px-4 pt-4">
            {DOC_TABS.map((tab) => {
              const active = isTabActive(tab);
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  onClick={() => setMobileOpen(false)}
                  className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-[rgba(128,128,128,0.08)]"
                  style={{
                    color: active ? "var(--m-text)" : "var(--m-text-muted)",
                    background: active
                      ? "rgba(128,128,128,0.08)"
                      : "transparent",
                  }}
                >
                  <span
                    className={tab.iconClass}
                    style={{ opacity: active ? 1 : 0.5 }}
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </Link>
              );
            })}

            <div
              className="my-2"
              style={{ borderTop: "1px solid var(--m-hairline)" }}
            />

            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-[rgba(128,128,128,0.08)]"
              style={{ color: "var(--m-text-muted)" }}
            >
              Home
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-[rgba(128,128,128,0.08)]"
              style={{ color: "var(--m-text-muted)" }}
            >
              Blog
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-[rgba(128,128,128,0.08)]"
              style={{ color: "var(--m-text-muted)" }}
            >
              Pricing
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-[rgba(128,128,128,0.08)] sm:hidden"
              style={{ color: "var(--m-text-muted)" }}
            >
              Sign In
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
