"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Sun,
  Moon,
  ChevronDown,
  ArrowLeft,
  Search,
  Bell,
  Users,
  LayoutGrid,
  Plug,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const docCategories = [
  {
    slug: "getting-started",
    label: "Getting Started",
    description: "Set up your account and connect your first source.",
    icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  },
  {
    slug: "ai-chat",
    label: "Chat",
    description: "Ask questions in plain English across all your data.",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
  {
    slug: "dashboards",
    label: "Dashboards",
    description: "Build and share drag-and-drop dashboards.",
    icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  },
  {
    slug: "connectors",
    label: "Connectors",
    description: "GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, Search Console.",
    icon: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  },
  {
    slug: "alerts",
    label: "Alerts",
    description: "Schedule AI-powered email reports on any cadence.",
    icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  },
  {
    slug: "teams",
    label: "Teams",
    description: "Manage roles, permissions, and billing.",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
];

const featureItems = [
  {
    href: "/features/natural-language",
    label: "Chat",
    description: "Ask in plain English across every connector",
    icon: Search,
  },
  {
    href: "/features/dashboards",
    label: "Dashboards",
    description: "AI-generated widgets on a drag-and-drop grid",
    icon: LayoutGrid,
  },
  {
    href: "/features/email-alerts",
    label: "Alerts",
    description: "Scheduled, prompt-driven email reports",
    icon: Bell,
  },
  {
    href: "/features/connectors",
    label: "Connectors",
    description: "GA4, Google Ads, LinkedIn, Mailchimp, and more",
    icon: Plug,
  },
  {
    href: "/features/team-collaboration",
    label: "Teams",
    description: "Roles, seats, and property-level access",
    icon: Users,
  },
  {
    href: "/features/ai-insights",
    label: "AI Insights",
    description: "Summaries and next-step recommendations",
    icon: Sparkles,
  },
];

const featureCards = [
  {
    href: "/features/visualizations",
    label: "14 chart types",
    description: "Auto-chosen for every question",
  },
  {
    href: "/features/real-time-analytics",
    label: "Live data",
    description: "Daily syncs across every connector",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/docs") return pathname.startsWith("/docs");
  return pathname === href;
}

type DropdownId = "features" | "docs" | null;
type MobilePanel = "main" | "features" | "docs";

/* ------------------------------------------------------------------ */
/*  Dropdown panel content                                             */
/* ------------------------------------------------------------------ */

function FeaturesContent() {
  return (
    <div className="flex gap-6">
      <div className="flex min-w-[200px] flex-col gap-0.5">
        {featureItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[rgba(128,128,128,0.08)]"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ background: "rgba(128,128,128,0.08)" }}>
                <Icon className="h-3.5 w-3.5 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {item.label}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="flex gap-3">
        {/* Chart types card — grid + staircase lines */}
        <Link
          href={featureCards[0].href}
          className="group relative flex w-[180px] self-stretch flex-col justify-start overflow-hidden rounded-xl border p-4 transition-all hover:border-[rgba(255,255,255,0.2)]"
          style={{
            borderColor: "rgba(128,128,128,0.1)",
            background: "rgba(128,128,128,0.04)",
          }}
        >
          <div className="relative z-10">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {featureCards[0].label}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              {featureCards[0].description}
            </div>
          </div>
          {/* Abstract area chart — layered mountain silhouettes */}
          <svg className="absolute bottom-0 left-0 right-0 h-[60%] w-full opacity-[0.1] transition-opacity group-hover:opacity-[0.22]" viewBox="0 0 180 100" preserveAspectRatio="none" aria-hidden>
            {/* Back layer */}
            <path d="M0,100 L0,70 Q20,55 40,62 Q60,50 80,40 Q100,30 120,38 Q140,46 160,35 Q170,30 180,32 L180,100 Z" fill="currentColor" opacity="0.3" />
            {/* Mid layer */}
            <path d="M0,100 L0,80 Q25,68 50,74 Q70,65 90,55 Q110,48 130,58 Q150,65 170,52 L180,50 L180,100 Z" fill="currentColor" opacity="0.5" />
            {/* Front layer */}
            <path d="M0,100 L0,88 Q30,78 55,82 Q75,75 95,70 Q115,66 135,74 Q155,80 180,72 L180,100 Z" fill="currentColor" opacity="0.7" />
          </svg>
        </Link>

        {/* Live data card — concentric arcs */}
        <Link
          href={featureCards[1].href}
          className="group relative flex w-[180px] self-stretch flex-col justify-start overflow-hidden rounded-xl border p-4 transition-all hover:border-[rgba(255,255,255,0.2)]"
          style={{
            borderColor: "rgba(128,128,128,0.1)",
            background: "rgba(128,128,128,0.04)",
          }}
        >
          <div className="relative z-10">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {featureCards[1].label}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              {featureCards[1].description}
            </div>
          </div>
          {/* Abstract concentric arcs radiating from bottom-right */}
          <svg className="absolute -bottom-4 -right-4 h-[70%] w-[85%] opacity-[0.15] transition-opacity group-hover:opacity-[0.3]" viewBox="0 0 160 160" aria-hidden>
            {[24, 44, 64, 84, 104, 124, 144].map((r) => (
              <circle key={r} cx="160" cy="160" r={r} fill="none" stroke="currentColor" strokeWidth="0.8" />
            ))}
            {/* Accent dots along arcs */}
            <circle cx={160 - 44} cy={160 - Math.sqrt(44*44 - 44*44/4)} r="2" fill="currentColor" opacity="0.4" />
            <circle cx={160 - 84 * 0.7} cy={160 - 84 * 0.7} r="1.5" fill="currentColor" opacity="0.3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function DocsContent() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 pb-1">
      {docCategories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/docs?section=${cat.slug}`}
          className="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-[rgba(128,128,128,0.08)]"
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
            className="mt-0.5 shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            <path d={cat.icon} />
          </svg>
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {cat.label}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {cat.description}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Morphing dropdown container (Resend-style)                         */
/* ------------------------------------------------------------------ */

function MorphDropdown({
  activeId,
  children,
  onEnter,
  onLeave,
  top,
}: {
  activeId: DropdownId;
  children: Record<string, ReactNode>;
  onEnter: () => void;
  onLeave: () => void;
  top: number;
}) {
  const sizes = useRef<Record<string, { w: number; h: number }>>({});
  const [targetSize, setTargetSize] = useState<{ w: number; h: number } | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Pre-measure all panels once on mount via hidden container
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const panels = el.children;
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i] as HTMLElement;
      const id = panel.dataset.panel;
      if (id) {
        sizes.current[id] = { w: panel.offsetWidth, h: panel.offsetHeight };
      }
    }
    // Set initial size
    if (activeId && sizes.current[activeId]) {
      setTargetSize(sizes.current[activeId]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update target size when activeId changes
  useEffect(() => {
    if (activeId && sizes.current[activeId]) {
      setTargetSize(sizes.current[activeId]);
    }
  }, [activeId]);

  if (!activeId) return null;

  const padding = 56; // p-6 + extra bottom breathing room

  return (
    <div
      className="fixed left-0 right-0 z-40 hidden md:block"
      style={{ top }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Hidden measurement layer — renders both panels offscreen to get sizes */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none fixed left-[-9999px] top-0 opacity-0"
      >
        {Object.entries(children).map(([id, content]) => (
          <div key={id} data-panel={id} className="w-fit">
            {content}
          </div>
        ))}
      </div>

      {/* Invisible hover bridge */}
      <div className="h-2" />

      <div className="flex justify-center px-4">
        <motion.div
          className="nav-glass overflow-hidden rounded-2xl"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            width: targetSize ? targetSize.w + padding : "auto",
            height: targetSize ? targetSize.h + padding : "auto",
          }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{
            opacity: { duration: 0.2 },
            y: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
            scale: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
            width: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
            height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
          }}
        >
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeId}
                initial={{ opacity: 0, x: activeId === "docs" ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: activeId === "docs" ? -20 : 20 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {children[activeId]}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();

  // Desktop dropdown
  const [activeDropdown, setActiveDropdown] = useState<DropdownId>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [navBottom, setNavBottom] = useState(0);

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("main");
  const [mobileSlideDir, setMobileSlideDir] = useState<"left" | "right">("right");

  // Scroll state for border
  const [scrolled, setScrolled] = useState(false);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  // Track nav bottom for dropdown positioning
  useEffect(() => {
    if (navRef.current) {
      setNavBottom(navRef.current.getBoundingClientRect().bottom);
    }
  }, [scrolled]);

  // Track scroll for border via a sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Close on route change
  useEffect(() => {
    setActiveDropdown(null);
    setMobileOpen(false);
    setMobilePanel("main");
  }, [pathname]);

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

  // Hover helpers
  const handleEnter = useCallback((id: DropdownId) => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setActiveDropdown(id);
    if (navRef.current) {
      setNavBottom(navRef.current.getBoundingClientRect().bottom);
    }
  }, []);

  const handleLeave = useCallback(() => {
    closeTimeout.current = setTimeout(() => setActiveDropdown(null), 250);
  }, []);

  return (
    <>
    <div ref={sentinelRef} aria-hidden className="h-px w-px" />
    <div className="fixed inset-x-0 top-0 z-50">
      <nav
        ref={navRef}
        className={cn(
          "nav-glass-bar grid grid-cols-[auto_1fr_auto] items-center px-4 py-3 transition-all duration-300 sm:px-6 sm:py-4",
          scrolled
            ? "nav-glass-scrolled"
            : "bg-transparent border-b border-transparent"
        )}
      >
        {/* Logo */}
        <Link href="/" className="shrink-0 justify-self-start">
          <Image
            src="/Logo.svg"
            alt="Meaning"
            width={120}
            height={42}
            className="h-8 w-auto sm:h-9 invert dark:invert-0"
            priority
          />
        </Link>

        {/* Desktop Navigation — centered */}
        <div className="hidden justify-self-center md:flex">
          <div className="flex items-center gap-0.5">
            {/* Features trigger */}
            <button
              onMouseEnter={() => handleEnter("features")}
              onMouseLeave={handleLeave}
              onClick={() =>
                setActiveDropdown(
                  activeDropdown === "features" ? null : "features"
                )
              }
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeDropdown === "features"
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Product
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  activeDropdown === "features" && "rotate-180"
                )}
              />
            </button>

            {/* Docs trigger */}
            <button
              onMouseEnter={() => handleEnter("docs")}
              onMouseLeave={handleLeave}
              onClick={() =>
                setActiveDropdown(activeDropdown === "docs" ? null : "docs")
              }
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeDropdown === "docs"
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Docs
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  activeDropdown === "docs" && "rotate-180"
                )}
              />
            </button>

            {/* Blog */}
            <Link
              href="/blog"
              onMouseEnter={() => handleLeave()}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, "/blog")
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Blog
            </Link>

            {/* Pricing */}
            <Link
              href="/pricing"
              onMouseEnter={() => handleLeave()}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, "/pricing")
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Pricing
            </Link>

            {/* Contact */}
            <Link
              href="/contact"
              onMouseEnter={() => handleLeave()}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, "/contact")
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Contact
            </Link>
          </div>
        </div>

        {/* Desktop Right — auth + theme */}
        <div className="hidden justify-self-end md:flex">
          <div className="flex items-center gap-0.5">
            {session ? (
              <>
                <Link
                  href="/"
                  className={cn(
                    "inline-flex h-9 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === "/"
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Chat
                </Link>
                <Link
                  href="/account"
                  className={cn(
                    "inline-flex h-9 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === "/account"
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Account
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex h-9 cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center rounded-md px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Log in
                </Link>
                <Button asChild className="ml-1 rounded-full">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}

            {/* Theme toggle */}
            <ThemeSwitch className="ml-1" />
          </div>
        </div>

        {/* Mobile Right — Get Started + Hamburger */}
        <div className="col-start-3 row-start-1 flex items-center gap-2 justify-self-end md:hidden">
          {!session && (
            <Link
              href="/signup"
              className="btn-primary inline-flex h-8 items-center rounded-full px-4 text-xs font-medium"
            >
              Get started
            </Link>
          )}
          <button
            onClick={() => {
              if (mobileOpen) {
                setMobileOpen(false);
              } else {
                setMobileOpen(true);
                setMobilePanel("main");
              }
            }}
            className="group inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-[rgba(128,128,128,0.1)]"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <div className="relative h-4 w-5">
              <span
                className="absolute left-0 h-[1.5px] w-full rounded-full bg-[var(--text-primary)] transition-all duration-300 ease-in-out"
                style={{
                  top: mobileOpen ? "50%" : "0",
                  transform: mobileOpen ? "translateY(-50%) rotate(45deg)" : "none",
                }}
              />
              <span
                className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rounded-full bg-[var(--text-primary)] transition-all duration-300 ease-in-out"
                style={{
                  opacity: mobileOpen ? 0 : 1,
                  transform: mobileOpen ? "translateY(-50%) scaleX(0)" : "translateY(-50%) scaleX(1)",
                }}
              />
              <span
                className="absolute left-0 h-[1.5px] w-full rounded-full bg-[var(--text-primary)] transition-all duration-300 ease-in-out"
                style={{
                  bottom: mobileOpen ? "auto" : "0",
                  top: mobileOpen ? "50%" : "auto",
                  transform: mobileOpen ? "translateY(-50%) rotate(-45deg)" : "none",
                }}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* ============================================================== */}
      {/*  Desktop Morphing Dropdown (Resend-style)                      */}
      {/* ============================================================== */}
      <AnimatePresence>
        {activeDropdown && (
          <MorphDropdown
            activeId={activeDropdown}
            top={navBottom}
            onEnter={() => handleEnter(activeDropdown)}
            onLeave={handleLeave}
          >
            {{
              features: <FeaturesContent />,
              docs: <DocsContent />,
            }}
          </MorphDropdown>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/*  Mobile Full-screen Menu                                       */}
      {/* ============================================================== */}
      {mobileOpen && (
        <div className="mobile-menu-in fixed inset-x-0 bottom-0 z-[100] flex flex-col bg-[var(--nav-bg)] md:hidden" style={{ top: navBottom || 56 }}>
          <div className="flex-1 overflow-y-auto px-4 pt-4">
            {mobilePanel === "main" && (
              <div key="main" className={cn("flex flex-col gap-1", mobileSlideDir === "left" ? "mobile-slide-left" : "mobile-slide-right")}>
                <button
                  onClick={() => { setMobileSlideDir("right"); setMobilePanel("features"); }}
                  className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-base font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Product
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>

                <button
                  onClick={() => { setMobileSlideDir("right"); setMobilePanel("docs"); }}
                  className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-base font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Docs
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>

                <Link href="/blog" onClick={() => setMobileOpen(false)} className={cn("rounded-lg px-4 py-3 text-base font-medium transition-colors", isActive(pathname, "/blog") ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]")}>
                  Blog
                </Link>

                <Link href="/pricing" onClick={() => setMobileOpen(false)} className={cn("rounded-lg px-4 py-3 text-base font-medium transition-colors", isActive(pathname, "/pricing") ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]")}>
                  Pricing
                </Link>

                <Link href="/contact" onClick={() => setMobileOpen(false)} className={cn("rounded-lg px-4 py-3 text-base font-medium transition-colors", isActive(pathname, "/contact") ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]")}>
                  Contact
                </Link>

                <div className="my-2 border-t border-[var(--border-color)]" />

                {session ? (
                  <>
                    <Link href="/" onClick={() => setMobileOpen(false)} className={cn("rounded-lg px-4 py-3 text-base font-medium transition-colors", pathname === "/" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]")}>
                      Chat
                    </Link>
                    <Link href="/account" onClick={() => setMobileOpen(false)} className={cn("rounded-lg px-4 py-3 text-base font-medium transition-colors", pathname === "/account" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]")}>
                      Account
                    </Link>
                    <button onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/" }); }} className="cursor-pointer rounded-lg px-4 py-3 text-left text-base font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]">
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg px-4 py-3 text-base font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]">
                      Log in
                    </Link>
                  </>
                )}

                <ThemeSwitch className="mt-2" />
              </div>
            )}

            {mobilePanel === "features" && (
              <div key="features" className="mobile-slide-right flex flex-col">
                <button onClick={() => { setMobileSlideDir("left"); setMobilePanel("main"); }} className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="mb-6 grid grid-cols-2 gap-3">
                  {featureCards.map((card) => (
                    <Link key={card.label} href={card.href} onClick={() => setMobileOpen(false)} className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--border-color)] p-4 transition-colors hover:border-[var(--text-muted)]" style={{ background: "var(--card-bg)" }}>
                      <div className="card-noise" aria-hidden />
                      <div className="relative z-10">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{card.label}</div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">{card.description}</div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="flex flex-col">
                  {featureItems.map((item, i) => (
                    <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className={cn("py-4 text-base font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]", i < featureItems.length - 1 && "border-b border-[var(--border-color)]")}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {mobilePanel === "docs" && (
              <div key="docs" className="mobile-slide-right flex flex-col">
                <button onClick={() => { setMobileSlideDir("left"); setMobilePanel("main"); }} className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex flex-col">
                  {docCategories.map((cat, i) => (
                    <Link key={cat.slug} href={`/docs?section=${cat.slug}`} onClick={() => setMobileOpen(false)} className={cn("flex items-start gap-3 py-4 transition-colors hover:text-[var(--text-primary)]", i < docCategories.length - 1 && "border-b border-[var(--border-color)]")}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" style={{ color: "var(--text-muted)" }}><path d={cat.icon} /></svg>
                      <div>
                        <div className="text-base font-medium text-[var(--text-secondary)]">{cat.label}</div>
                        <div className="mt-0.5 text-sm text-[var(--text-muted)]">{cat.description}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
