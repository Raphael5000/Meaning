"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Zap,
  Bell,
  Users,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const docCategories = [
  {
    slug: "getting-started",
    label: "Getting Started",
    description: "Learn the basics and set up your account.",
  },
  {
    slug: "google-analytics",
    label: "Google Analytics",
    description: "Understand GA4 concepts and metrics.",
  },
  {
    slug: "generative-search",
    label: "Generative Search",
    description: "Get the most out of natural language queries.",
  },
  {
    slug: "metrics-and-dimensions",
    label: "Metrics & Dimensions",
    description: "Deep dives into analytics metrics.",
  },
  {
    slug: "guides",
    label: "Guides",
    description: "Step-by-step tutorials to master Meaning.",
  },
  {
    slug: "use-cases",
    label: "Use Cases",
    description: "Real-world examples and success stories.",
  },
];

const featureItems = [
  {
    href: "/features/natural-language",
    label: "Natural Language Queries",
    description: "Ask questions in plain English",
    icon: Search,
  },
  {
    href: "/features/real-time-analytics",
    label: "Real-time Analytics",
    description: "Live data from your GA4 properties",
    icon: Zap,
  },
  {
    href: "/features/email-alerts",
    label: "Email Alerts",
    description: "Scheduled reports to your inbox",
    icon: Bell,
  },
  {
    href: "/features/team-collaboration",
    label: "Team Collaboration",
    description: "Invite members and control access",
    icon: Users,
  },
];

const featureCards = [
  {
    href: "/features/visualizations",
    label: "Rich Visualizations",
    description: "AI-generated charts, graphs, and maps",
  },
  {
    href: "/features/automated-reports",
    label: "Automated Reports",
    description: "Weekly snapshots and custom reports",
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

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("main");
  const [mobileSlideDir, setMobileSlideDir] = useState<"left" | "right">("right");

  // Scroll state for border
  const [scrolled, setScrolled] = useState(false);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  // Track scroll for border
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 0);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
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

  // Close dropdown on route change
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

  // Hover helpers — shared by triggers AND panels
  const handleEnter = useCallback((id: DropdownId) => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setActiveDropdown(id);
  }, []);

  const handleLeave = useCallback(() => {
    closeTimeout.current = setTimeout(() => setActiveDropdown(null), 250);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="sticky top-0 z-50">
      <nav
        ref={navRef}
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--nav-bg) 80%, transparent)",
        }}
        className={cn(
          "flex items-center justify-between px-4 py-3 backdrop-blur-xl transition-[border-color] duration-300 sm:px-6 sm:py-4",
          scrolled
            ? "border-b border-[var(--border-color)]"
            : "border-b border-transparent"
        )}
      >
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/Logo.svg"
            alt="Meaning"
            width={120}
            height={42}
            className="h-8 w-auto sm:h-9 invert dark:invert-0"
            priority
          />
        </Link>

        {/* ========================================================== */}
        {/*  Desktop Navigation                                        */}
        {/* ========================================================== */}
        <div className="hidden items-center md:flex">
          {/* Nav links group */}
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
              Features
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

            {/* Pricing */}
            <Link
              href="/pricing"
              onMouseEnter={() => handleLeave()}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, "/pricing")
                  ? "text-[var(--accent)]"
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
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Contact
            </Link>
          </div>

          {/* Separator */}
          <div className="mx-3 h-5 w-px bg-[var(--border-color)]" />

          {/* Auth + theme */}
          <div className="flex items-center gap-0.5">
            {session ? (
              <>
                <Link
                  href="/"
                  className={cn(
                    "inline-flex h-9 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === "/"
                      ? "text-[var(--accent)]"
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
                      ? "text-[var(--accent)]"
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
            <button
              onClick={toggleTheme}
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-tertiary)]"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? (
                <Moon
                  className="h-4 w-4"
                  style={{ color: "var(--text-secondary)" }}
                />
              ) : (
                <Sun
                  className="h-4 w-4"
                  style={{ color: "var(--text-secondary)" }}
                />
              )}
            </button>
          </div>
        </div>

        {/* ========================================================== */}
        {/*  Mobile Menu Toggle                                        */}
        {/* ========================================================== */}
        <button
          onClick={() => {
            if (mobileOpen) {
              setMobileOpen(false);
            } else {
              setMobileOpen(true);
              setMobilePanel("main");
            }
          }}
          className="group inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-tertiary)] md:hidden"
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
      </nav>

      {/* ============================================================== */}
      {/*  Desktop Dropdown Panels (rendered OUTSIDE nav, below it)      */}
      {/* ============================================================== */}
      {activeDropdown && (
        <div
          className="fixed left-0 right-0 z-40 hidden md:block animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ top: navRef.current?.getBoundingClientRect().bottom ?? 0 }}
          onMouseEnter={() => handleEnter(activeDropdown)}
          onMouseLeave={handleLeave}
        >
          {/* Invisible hover bridge spanning full width */}
          <div className="h-2" />

          {/* Panel container */}
          <div className="flex justify-center px-4">
            {activeDropdown === "features" && (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-xl">
                <div className="flex gap-6">
                  {/* Feature list items */}
                  <div className="flex min-w-[200px] flex-col gap-1">
                    {featureItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="group rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-tertiary)]"
                      >
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {item.label}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {item.description}
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Feature cards */}
                  <div className="flex gap-3">
                    {featureCards.map((card) => (
                      <Link
                        key={card.label}
                        href={card.href}
                        className="group relative flex w-[200px] flex-col justify-between overflow-hidden rounded-xl border border-[var(--border-color)] p-5 transition-all hover:border-[var(--text-muted)] hover:shadow-[var(--shadow-card-hover)]"
                        style={{
                          background: "var(--card-bg)",
                        }}
                      >
                        <div className="card-noise" aria-hidden />
                        <div className="relative z-10">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">
                            {card.label}
                          </div>
                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            {card.description}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDropdown === "docs" && (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-xl">
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {docCategories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/docs?category=${cat.slug}`}
                      className="group rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-tertiary)]"
                    >
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {cat.label}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {cat.description}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/*  Mobile Full-screen Menu                                       */}
      {/* ============================================================== */}
      {mobileOpen && (
        <div className="mobile-menu-in fixed inset-x-0 bottom-0 z-[100] flex flex-col bg-[var(--nav-bg)] md:hidden" style={{ top: navRef.current?.getBoundingClientRect().bottom ?? 0 }}>

          {/* Mobile content */}
          <div className="flex-1 overflow-y-auto px-4 pt-4">
            {/* ---- Main panel ---- */}
            {mobilePanel === "main" && (
              <div key="main" className={cn("flex flex-col gap-1", mobileSlideDir === "left" ? "mobile-slide-left" : "mobile-slide-right")}>
                <button
                  onClick={() => { setMobileSlideDir("right"); setMobilePanel("features"); }}
                  className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-base font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Features
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>

                <button
                  onClick={() => { setMobileSlideDir("right"); setMobilePanel("docs"); }}
                  className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-base font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Docs
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>

                <Link
                  href="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                    isActive(pathname, "/pricing")
                      ? "bg-[rgba(16,163,127,0.1)] text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Pricing
                </Link>

                <Link
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                    isActive(pathname, "/contact")
                      ? "bg-[rgba(16,163,127,0.1)] text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Contact
                </Link>

                <div className="my-2 border-t border-[var(--border-color)]" />

                {session ? (
                  <>
                    <Link
                      href="/"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                        pathname === "/"
                          ? "bg-[rgba(16,163,127,0.1)] text-[var(--accent)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      Chat
                    </Link>
                    <Link
                      href="/account"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                        pathname === "/account"
                          ? "bg-[rgba(16,163,127,0.1)] text-[var(--accent)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      Account
                    </Link>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="cursor-pointer rounded-lg px-4 py-3 text-left text-base font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-4 py-3 text-base font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      Log in
                    </Link>
                    <div className="my-2 border-t border-[var(--border-color)]" />
                    <Link
                      href="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="btn-primary-gradient text-center text-base font-semibold"
                    >
                      Get started
                    </Link>
                  </>
                )}

                <button
                  onClick={toggleTheme}
                  className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-tertiary)]"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? (
                    <Moon
                      className="h-4 w-4"
                      style={{ color: "var(--text-secondary)" }}
                    />
                  ) : (
                    <Sun
                      className="h-4 w-4"
                      style={{ color: "var(--text-secondary)" }}
                    />
                  )}
                </button>
              </div>
            )}

            {/* ---- Features sub-panel ---- */}
            {mobilePanel === "features" && (
              <div key="features" className="mobile-slide-right flex flex-col">
                <button
                  onClick={() => { setMobileSlideDir("left"); setMobilePanel("main"); }}
                  className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="mb-6 grid grid-cols-2 gap-3">
                  {featureCards.map((card) => (
                    <Link
                      key={card.label}
                      href={card.href}
                      onClick={() => setMobileOpen(false)}
                      className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--border-color)] p-4 transition-colors hover:border-[var(--text-muted)]"
                      style={{
                        background: "var(--card-bg)",
                      }}
                    >
                      <div className="card-noise" aria-hidden />
                      <div className="relative z-10">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          {card.label}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {card.description}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="flex flex-col">
                  {featureItems.map((item, i) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "py-4 text-base font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]",
                        i < featureItems.length - 1 &&
                          "border-b border-[var(--border-color)]"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ---- Docs sub-panel ---- */}
            {mobilePanel === "docs" && (
              <div key="docs" className="mobile-slide-right flex flex-col">
                <button
                  onClick={() => { setMobileSlideDir("left"); setMobilePanel("main"); }}
                  className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="flex flex-col">
                  {docCategories.map((cat, i) => (
                    <Link
                      key={cat.slug}
                      href={`/docs?category=${cat.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "py-4 transition-colors hover:text-[var(--text-primary)]",
                        i < docCategories.length - 1 &&
                          "border-b border-[var(--border-color)]"
                      )}
                    >
                      <div className="text-base font-medium text-[var(--text-secondary)]">
                        {cat.label}
                      </div>
                      <div className="mt-0.5 text-sm text-[var(--text-muted)]">
                        {cat.description}
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
  );
}
