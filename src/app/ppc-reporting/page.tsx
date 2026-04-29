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
  BarChart3,
  DollarSign,
  TrendingUp,
  Bell,
  MessageSquare,
  LayoutGrid,
} from "lucide-react";

export const metadata: Metadata = {
  title: "PPC Reporting Tool — Google Ads & Microsoft Ads in One Dashboard",
  description:
    "Report on Google Ads and Microsoft Ads in one place. Meaning is the AI-powered PPC reporting tool that builds dashboards, answers questions, and sends scheduled reports — all from plain English.",
  keywords: [
    "ppc reporting tool",
    "google ads reporting",
    "microsoft ads reporting",
  ],
  alternates: { canonical: "/ppc-reporting" },
};

const PPC_FEATURES = [
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Ask anything about your ads",
    description:
      "\"What's my Google Ads ROAS this month?\" — ask in plain English and get the answer with a chart.",
  },
  {
    icon: <LayoutGrid className="h-6 w-6" />,
    title: "Blended PPC dashboards",
    description:
      "See Google Ads and Microsoft Ads side by side on a single dashboard. No switching between platforms.",
  },
  {
    icon: <DollarSign className="h-6 w-6" />,
    title: "Cross-platform ROAS",
    description:
      "Get blended ROAS, CPC, and conversion metrics across both ad platforms in a single query.",
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Automated PPC reports",
    description:
      "Schedule weekly or monthly PPC performance reports with AI summaries and recommendations.",
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Spend anomaly alerts",
    description:
      "Get flagged when CPC or daily spend deviates from the norm — before the budget is gone.",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Campaign deep dives",
    description:
      "Break down performance by campaign, ad group, keyword, or device in seconds.",
  },
];

export default function PpcReportingPage() {
  return (
    <div
      className="marketing relative min-h-screen overflow-x-clip"
      style={{ background: "var(--m-bg)" }}
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "PPC Reporting Tool — Google Ads & Microsoft Ads in One Dashboard",
          description:
            "AI-powered PPC reporting for Google Ads and Microsoft Ads.",
          url: "https://usemeaning.io/ppc-reporting",
        }}
      />
      <DottedGrid />
      <Navbar />

      {/* Hero */}
      <section className="relative z-10 px-6 pb-16 pt-32 md:px-12 md:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <GlowPill className="mb-6">PPC Reporting</GlowPill>
            <DisplayHeading size="2xl" as="h1" className="mb-6">
              PPC Reporting Tool — Google Ads &amp; Microsoft Ads in One Dashboard
            </DisplayHeading>
            <p
              className="mx-auto max-w-2xl text-lg text-[color:var(--m-text-secondary)] md:text-xl"
              style={{ lineHeight: "1.7" }}
            >
              Stop switching between Google Ads and Microsoft Ads to build reports.
              Meaning connects to both, lets you ask questions in plain English, and
              generates PPC dashboards, charts, and scheduled reports automatically.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <MarketingSection center maxWidth="6xl" heading="PPC reporting, reimagined">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PPC_FEATURES.map((feat, i) => (
            <Reveal key={feat.title} delay={i * 0.04}>
              <FeatureCard
                icon={feat.icon}
                title={feat.title}
                description={feat.description}
              />
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Example questions */}
      <MarketingSection
        center
        maxWidth="4xl"
        heading="Questions you can ask"
        subhead="Type these into Meaning and get an instant answer with a chart."
      >
        <div className="flex flex-col gap-3">
          {[
            "What's my Google Ads ROAS for the last 30 days?",
            "Compare Microsoft Ads CPC vs Google Ads CPC by week this quarter",
            "Which campaigns spent the most with the lowest conversion rate?",
            "Show me blended ad spend across Google and Microsoft Ads by month",
            "Top 10 keywords by conversions in Google Ads last 90 days",
          ].map((q, i) => (
            <Reveal key={q} delay={i * 0.04}>
              <div className="liquid-glass rounded-2xl p-4">
                <p className="text-sm" style={{ color: "var(--m-text)" }}>
                  &ldquo;{q}&rdquo;
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Explore */}
      <MarketingSection center maxWidth="4xl" heading="Explore more">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/features/connectors" className="btn-display btn-display-ghost">
            All connectors
          </Link>
          <Link href="/features/dashboards" className="btn-display btn-display-ghost">
            Dashboards
          </Link>
          <Link href="/features/email-alerts" className="btn-display btn-display-ghost">
            Automated reports
          </Link>
          <Link href="/marketing-analytics-tools" className="btn-display btn-display-ghost">
            Marketing analytics tools
          </Link>
        </div>
      </MarketingSection>

      <Reveal>
        <MarketingCta
          heading="Ready to simplify your PPC reporting?"
          subtitle="Get started free. Connect Google Ads and Microsoft Ads in under a minute."
        />
      </Reveal>

      <Footer />
    </div>
  );
}
