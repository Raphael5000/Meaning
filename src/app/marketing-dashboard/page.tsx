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
import { ChartTypeBadges } from "@/components/marketing/ChartTypeBadges";
import { JsonLd } from "@/components/JsonLd";
import {
  Sparkles,
  Move,
  Pin,
  DollarSign,
  BarChart3,
  Table,
} from "lucide-react";

export const metadata: Metadata = {
  title: "The Marketing Dashboard That Builds Itself",
  description:
    "Describe the widget you want in plain English. Meaning generates it with the right chart from 14 types on a drag-and-drop grid. The digital marketing dashboard for teams who'd rather ask than build.",
  keywords: [
    "digital marketing dashboard",
    "marketing kpi dashboard",
    "marketing performance dashboard",
    "marketing metrics dashboard",
  ],
  alternates: { canonical: "/marketing-dashboard" },
};

export default function MarketingDashboardPage() {
  return (
    <div
      className="marketing relative min-h-screen overflow-x-clip"
      style={{ background: "var(--m-bg)" }}
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "The Marketing Dashboard That Builds Itself",
          description:
            "AI-powered marketing dashboards. Describe what you want and Meaning builds it.",
          url: "https://usemeaning.io/marketing-dashboard",
        }}
      />
      <DottedGrid />
      <Navbar />

      {/* Hero */}
      <section className="relative z-10 px-6 pb-16 pt-32 md:px-12 md:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <GlowPill className="mb-6">Dashboards</GlowPill>
            <DisplayHeading size="2xl" as="h1" className="mb-6">
              The Marketing Dashboard That Builds Itself
            </DisplayHeading>
            <p
              className="mx-auto max-w-2xl text-lg text-[color:var(--m-text-secondary)] md:text-xl"
              style={{ lineHeight: "1.7" }}
            >
              Stop dragging metrics onto a grid. Describe the marketing KPI dashboard
              you want in a sentence — Meaning generates it with the right chart from
              14 types, on a drag-and-drop canvas you can resize and rearrange.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mx-auto mt-12 max-w-3xl">
              <div className="liquid-glass shimmer overflow-hidden rounded-2xl p-10">
                <ChartTypeBadges />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* What makes it different */}
      <MarketingSection center maxWidth="5xl" heading="Not another dashboard builder">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="AI-generated widgets"
              description="Ask for 'sessions by channel last 30 days' and Meaning generates the widget — no metric pickers, no configuration screens."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="14 chart types"
              description="Bar, line, pie, funnel, sankey, geo map, and more. Meaning picks the right one based on the shape of your data."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<Move className="h-6 w-6" />}
              title="Drag-and-drop grid"
              description="Resize, rearrange, and duplicate widgets on a responsive grid. Every change persists for the whole team."
            />
          </Reveal>
          <Reveal delay={0.18}>
            <FeatureCard
              icon={<DollarSign className="h-6 w-6" />}
              title="Currency-aware"
              description="Revenue values converted to your org's display currency at query time using live exchange rates."
            />
          </Reveal>
          <Reveal delay={0.24}>
            <FeatureCard
              icon={<Pin className="h-6 w-6" />}
              title="Pin from chat"
              description="Turn any chat answer into a permanent dashboard widget with one click."
            />
          </Reveal>
          <Reveal delay={0.3}>
            <FeatureCard
              icon={<Table className="h-6 w-6" />}
              title="Mix scorecards, charts & tables"
              description="Combine KPI scorecards, interactive charts, and sortable tables in a single view."
            />
          </Reveal>
        </div>
      </MarketingSection>

      {/* Connected sources */}
      <MarketingSection
        center
        maxWidth="4xl"
        heading="One dashboard, every marketing channel"
        subhead="Meaning connects to the platforms your team uses every day and lets you query them all from one marketing performance dashboard."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            "Google Analytics 4",
            "Google Ads",
            "Microsoft Ads",
            "LinkedIn",
            "Mailchimp",
            "Search Console",
          ].map((s, i) => (
            <Reveal key={s} delay={i * 0.04}>
              <div className="liquid-glass rounded-2xl p-4 text-center">
                <p className="text-sm font-medium" style={{ color: "var(--m-text)" }}>
                  {s}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-sm" style={{ color: "var(--m-text-muted)" }}>
          <Link href="/features/connectors" style={{ color: "var(--brand)" }} className="underline-offset-4 hover:underline">
            See all connectors →
          </Link>
        </p>
      </MarketingSection>

      {/* Explore */}
      <MarketingSection center maxWidth="4xl" heading="Explore more">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/features/dashboards" className="btn-display btn-display-ghost">
            Dashboard features
          </Link>
          <Link href="/features/visualizations" className="btn-display btn-display-ghost">
            14 chart types
          </Link>
          <Link href="/features/natural-language" className="btn-display btn-display-ghost">
            Natural language chat
          </Link>
          <Link href="/features/email-alerts" className="btn-display btn-display-ghost">
            Automated reports
          </Link>
        </div>
      </MarketingSection>

      <Reveal>
        <MarketingCta
          heading="Ready to build your marketing dashboard?"
          subtitle="Get started free. No credit card required."
        />
      </Reveal>

      <Footer />
    </div>
  );
}
