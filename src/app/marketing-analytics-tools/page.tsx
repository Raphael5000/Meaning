import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MarketingCta } from "@/components/marketing/MarketingCta";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { DisplayHeading } from "@/components/marketing/system/DisplayHeading";
import { GlowPill } from "@/components/marketing/system/MonoLabel";
import { Reveal } from "@/components/marketing/system/Reveal";
import { DottedGrid } from "@/components/marketing/system/Backgrounds";
import { JsonLd } from "@/components/JsonLd";
import {
  MessageSquare,
  LayoutGrid,
  Bell,
  BarChart3,
  Zap,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Marketing Analytics Tools — The AI-Powered Alternative",
  description:
    "Meaning is the AI-powered marketing analytics software that connects GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, and Search Console. Ask questions in plain English, get dashboards, alerts, and insights.",
  keywords: [
    "marketing analytics tools",
    "marketing analytics software",
    "ai marketing analytics",
  ],
  alternates: { canonical: "/marketing-analytics-tools" },
};

const CAPABILITIES = [
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Natural language queries",
    description:
      "Ask your marketing data anything in plain English. No SQL, no query builders, no learning curve.",
    href: "/features/natural-language",
  },
  {
    icon: <LayoutGrid className="h-6 w-6" />,
    title: "AI-generated dashboards",
    description:
      "Describe the widget you want. Meaning builds it, picks the chart, and drops it on a drag-and-drop grid.",
    href: "/features/dashboards",
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Automated email reports",
    description:
      "Write a prompt, set a schedule. Meaning emails the answer with an AI summary, chart, and next steps.",
    href: "/features/email-alerts",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "14 chart types, auto-chosen",
    description:
      "Bar, line, funnel, sankey, geo map, and more. Meaning reads your question and picks the right visualization.",
    href: "/features/visualizations",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Cross-channel analytics",
    description:
      "Query GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, and Search Console in a single request.",
    href: "/features/connectors",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Team collaboration",
    description:
      "Invite your team, assign roles, and share dashboards and alerts. Built for teams, not solo users.",
    href: "/features/team-collaboration",
  },
];

const COMPARISONS = [
  { label: "Meaning vs Looker Studio", href: "/compare/looker-studio" },
  { label: "Meaning vs Supermetrics", href: "/compare/supermetrics" },
  { label: "Meaning vs Databox", href: "/compare/databox" },
  { label: "Meaning vs PostHog", href: "/compare/posthog" },
  { label: "Meaning vs Whatagraph", href: "/compare/whatagraph" },
];

export default function MarketingAnalyticsToolsPage() {
  return (
    <div
      className="marketing relative min-h-screen overflow-x-clip"
      style={{ background: "var(--m-bg)" }}
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Marketing Analytics Tools — The AI-Powered Alternative",
          description:
            "Meaning is the AI-powered marketing analytics software that replaces traditional dashboard builders with natural language queries.",
          url: "https://usemeaning.io/marketing-analytics-tools",
        }}
      />
      <DottedGrid />
      <Navbar />

      {/* Hero */}
      <section className="relative z-10 px-6 pb-16 pt-32 md:px-12 md:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <GlowPill className="mb-6">Marketing Analytics</GlowPill>
            <DisplayHeading size="2xl" as="h1" className="mb-6">
              Marketing Analytics Tools — The AI-Powered Alternative
            </DisplayHeading>
            <p
              className="mx-auto max-w-2xl text-lg text-[color:var(--m-text-secondary)] md:text-xl"
              style={{ lineHeight: "1.7" }}
            >
              Traditional marketing analytics software makes you build dashboards,
              write queries, and stitch data together yourself. Meaning is the AI
              analyst that does it all — connect your sources, ask a question in plain
              English, and get the answer with a chart, a summary, and next steps.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Capabilities */}
      <MarketingSection center maxWidth="6xl" heading="Everything you need in one platform">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap, i) => (
            <Reveal key={cap.title} delay={i * 0.04}>
              <Link href={cap.href} className="block h-full">
                <FeatureCard
                  icon={cap.icon}
                  title={cap.title}
                  description={cap.description}
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Why AI-powered */}
      <MarketingSection
        center
        maxWidth="4xl"
        heading="Why AI-powered marketing analytics?"
        subhead="Traditional tools show you data. Meaning tells you what it means."
      >
        <div className="flex flex-col gap-6">
          {[
            {
              q: "What changed this week?",
              a: "Meaning scans your data and surfaces what moved — you don't have to go looking.",
            },
            {
              q: "Why did conversions drop?",
              a: "Ask in plain English. Meaning queries across sources and explains what happened.",
            },
            {
              q: "What should we do next?",
              a: "Every answer includes grounded recommendations based on your actual data.",
            },
          ].map((item, i) => (
            <Reveal key={item.q} delay={i * 0.04}>
              <div className="liquid-glass rounded-2xl p-6">
                <p
                  className="mb-2 text-base font-semibold"
                  style={{ color: "var(--m-text)" }}
                >
                  &ldquo;{item.q}&rdquo;
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--m-text-secondary)" }}
                >
                  {item.a}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Compare */}
      <MarketingSection center maxWidth="4xl" heading="How Meaning compares">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {COMPARISONS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="btn-display btn-display-ghost"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </MarketingSection>

      <Reveal>
        <MarketingCta
          heading="Ready to try Meaning?"
          subtitle="Get started free. Connect your first data source in under a minute."
        />
      </Reveal>

      <Footer />
    </div>
  );
}
