import Link from "next/link";
import Image from "next/image";

const columns = [
  {
    title: "Features",
    links: [
      { label: "Natural Language Queries", href: "/features/natural-language" },
      { label: "Real-time Analytics", href: "/features/real-time-analytics" },
      { label: "Email Alerts", href: "/features/email-alerts" },
      { label: "Team Collaboration", href: "/features/team-collaboration" },
      { label: "Rich Visualizations", href: "/features/visualizations" },
      { label: "Automated Reports", href: "/features/automated-reports" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      className="relative z-10 px-6 py-16 md:px-12"
      style={{ borderTop: "1px solid var(--border-color)" }}
    >
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_auto]">
        {/* Left column — brand */}
        <div className="flex flex-col items-start gap-6">
          <Image
            src="/Logo.svg"
            alt="Meaning"
            width={110}
            height={40}
            className="h-7 w-auto invert dark:invert-0"
          />
          <p
            className="max-w-xs text-sm leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Chat with your Google Analytics data in plain English. Instant
            insights, no dashboards needed.
          </p>
          <div className="flex items-center gap-2">
            <span
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Built by
            </span>
            <a
              href="https://www.hivory.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
            >
              Hivory
            </a>
          </div>
        </div>

        {/* Right columns — links */}
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <p
                className="mb-4 text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {col.title}
              </p>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:opacity-80"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row"
        style={{ borderColor: "var(--border-color)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          &copy; {new Date().getFullYear()} Meaning. All rights reserved.
        </p>
        <div
          className="flex items-center gap-6 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <Link href="/privacy" className="transition-opacity hover:opacity-80">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition-opacity hover:opacity-80">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
