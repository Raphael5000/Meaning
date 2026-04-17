import Link from "next/link";
import Image from "next/image";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Chat", href: "/features/natural-language" },
      { label: "Dashboards", href: "/features/dashboards" },
      { label: "Alerts", href: "/features/email-alerts" },
      { label: "Connectors", href: "/features/connectors" },
      { label: "AI Insights", href: "/features/ai-insights" },
      { label: "Teams", href: "/features/team-collaboration" },
      { label: "Visualizations", href: "/features/visualizations" },
      { label: "Real-time analytics", href: "/features/real-time-analytics" },
    ],
  },
  {
    title: "Compare",
    links: [
      { label: "Meaning vs Looker Studio", href: "/compare/looker-studio" },
      { label: "Meaning vs Supermetrics", href: "/compare/supermetrics" },
      { label: "Meaning vs PostHog", href: "/compare/posthog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Blog", href: "/blog" },
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
    <footer className="hairline-t relative z-10 px-6 py-16 md:px-12">
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
          <p className="max-w-xs text-sm leading-relaxed text-[color:var(--m-text-muted)]">
            The AI analyst for your marketing stack. Ask anything across GA4,
            Google Ads, LinkedIn, Mailchimp, and more — in plain English.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[color:var(--m-text-muted)]">
              Built by
            </span>
            <a
              href="https://www.hivory.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[color:var(--m-text-secondary)] transition-opacity hover:opacity-80"
            >
              Hivory
            </a>
          </div>
        </div>

        {/* Right columns — links */}
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="mono-label mb-4">{col.title}</p>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[color:var(--m-text-muted)] transition-colors hover:opacity-80"
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
        style={{ borderColor: "var(--m-hairline)" }}
      >
        <p className="text-xs text-[color:var(--m-text-muted)]">
          &copy; {new Date().getFullYear()} Meaning. All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-xs text-[color:var(--m-text-muted)]">
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
