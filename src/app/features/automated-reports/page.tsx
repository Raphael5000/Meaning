"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { FadeInSection } from "@/components/FadeInSection";
import { CtaSection } from "@/components/CtaSection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  Repeat,
  Sparkles,
  Send,
  Settings,
} from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Scheduled Delivery",
    description: "Set it once, reports arrive on time. Daily, weekly, or monthly — you choose the cadence.",
  },
  {
    icon: Sparkles,
    title: "AI Insights",
    description: "Every report includes actionable recommendations powered by AI analysis of your data.",
  },
  {
    icon: FileText,
    title: "Custom Prompts",
    description: "Define reports in plain English. Tell Meaning what you want to know and it builds the report.",
  },
  {
    icon: Repeat,
    title: "Multi-property",
    description: "Reports spanning multiple GA4 properties, unified into a single view.",
  },
  {
    icon: Send,
    title: "Team Distribution",
    description: "Send reports to your entire team automatically. Everyone stays in the loop.",
  },
  {
    icon: Settings,
    title: "Historical Comparison",
    description: "Automatic period-over-period analysis so you always know what changed and why.",
  },
];

export default function AutomatedReportsPage() {
  return (
    <div
      className="relative min-h-screen"
      style={{ background: "var(--page-bg)" }}
    >
      {/* Background orbs */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
      >
        <div
          className="absolute left-1/4 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
          style={{ top: "5%", background: "var(--accent)" }}
        />
        <div
          className="absolute right-1/4 h-80 w-80 rounded-full opacity-[0.06] blur-3xl"
          style={{ top: "35%", background: "#6366f1" }}
        />
        <div
          className="absolute left-1/3 h-72 w-72 rounded-full opacity-[0.08] blur-3xl"
          style={{ top: "65%", background: "var(--accent)" }}
        />
      </div>

      <Navbar />

      {/* ---------------------------------------------------------------- */}
      {/*  HERO                                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center md:px-12">
        <FadeInSection>
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
            style={{
              background: "rgba(16, 163, 127, 0.1)",
              border: "1px solid rgba(16, 163, 127, 0.3)",
              color: "var(--accent)",
            }}
          >
            Set &amp; Forget
          </div>
        </FadeInSection>

        <FadeInSection delay={100}>
          <h1
            className="mb-4 text-4xl md:text-6xl"
            style={{ color: "var(--text-primary)" }}
          >
            Reports that{" "}
            <span style={{ color: "var(--accent)" }}>write themselves</span>
          </h1>
        </FadeInSection>

        <FadeInSection delay={200}>
          <p
            className="mx-auto mb-10 max-w-2xl text-lg md:text-xl"
            style={{ color: "var(--text-secondary)" }}
          >
            Schedule AI-powered reports, delivered to your inbox on autopilot.
            No dashboards to check, no exports to run.
          </p>
        </FadeInSection>

        <FadeInSection delay={300}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="rounded-full px-8 py-3 text-base font-semibold">
                Get started free
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                className="rounded-full px-8 py-3 text-base font-semibold"
              >
                View pricing
              </Button>
            </Link>
          </div>
        </FadeInSection>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/*  REPORT PREVIEW                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-4xl">
          <FadeInSection>
            <div
              className="relative overflow-hidden rounded-2xl p-8 md:p-10"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                {/* Report header */}
                <div className="mb-6 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: "rgba(16, 163, 127, 0.15)" }}
                  >
                    <FileText size={20} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Weekly Performance Report
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Feb 24 &ndash; Mar 2, 2026
                    </p>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    { label: "Sessions", value: "12,847", change: "+8%" },
                    { label: "Users", value: "9,234", change: "+5%" },
                    { label: "Conversions", value: "342", change: "+12%" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(16, 163, 127, 0.05)",
                        border: "1px solid rgba(16, 163, 127, 0.15)",
                      }}
                    >
                      <p
                        className="mb-1 text-xs font-medium uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {m.label}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-2xl font-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {m.value}
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--accent)" }}
                        >
                          {m.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Insight */}
                <div
                  className="mb-4 rounded-xl p-5"
                  style={{
                    background: "rgba(16, 163, 127, 0.06)",
                    border: "1px solid rgba(16, 163, 127, 0.18)",
                  }}
                >
                  <p
                    className="mb-1 flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    <Sparkles size={14} />
                    AI Insight
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Traffic from organic search increased 15% week-over-week,
                    driven primarily by your new blog content. The top-performing
                    page was &ldquo;GA4 for Small Business Owners&rdquo; which
                    accounted for 23% of all new sessions.
                  </p>
                </div>

                {/* Recommendation */}
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(99, 102, 241, 0.06)",
                    border: "1px solid rgba(99, 102, 241, 0.18)",
                  }}
                >
                  <p
                    className="mb-1 text-sm font-semibold"
                    style={{ color: "#818cf8" }}
                  >
                    Recommendation
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Consider increasing ad spend on high-performing campaigns
                    targeting organic keywords. Your conversion rate from search
                    traffic is 2.4x higher than paid — double down on what works.
                  </p>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/*  REPORT TYPES — alternating layout                               */}
      {/* ---------------------------------------------------------------- */}

      {/* Section A: text left, visual right */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <FadeInSection>
            <div>
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
                style={{
                  background: "rgba(16, 163, 127, 0.1)",
                  border: "1px solid rgba(16, 163, 127, 0.3)",
                  color: "var(--accent)",
                }}
              >
                <Repeat size={14} />
                Recurring
              </div>
              <h2
                className="mb-4 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Weekly Snapshots
              </h2>
              <p
                className="max-w-md text-lg leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                An automated summary of your most important metrics, delivered
                every Monday morning. See what moved, what stalled, and where to
                focus your energy this week.
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={150}>
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Weekly Summary
                  </p>
                  <span
                    className="rounded-full px-3 py-1 text-xs"
                    style={{
                      background: "rgba(16, 163, 127, 0.1)",
                      color: "var(--accent)",
                    }}
                  >
                    Every Monday
                  </span>
                </div>
                {["Top pages by traffic", "Conversion funnel breakdown", "Traffic source changes", "Goal completions vs. target"].map(
                  (item, i) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 border-b py-3"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          background: "rgba(16, 163, 127, 0.15)",
                          color: "var(--accent)",
                        }}
                      >
                        {i + 1}
                      </div>
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {item}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Section B: visual left, text right */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <FadeInSection>
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <p
                  className="mb-3 text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Custom Report Prompt
                </p>
                <div
                  className="mb-4 rounded-xl p-4"
                  style={{
                    background: "rgba(16, 163, 127, 0.04)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <p
                    className="text-sm italic leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    &ldquo;Every Friday, send me a report comparing this
                    week&apos;s mobile vs desktop conversion rates, broken down
                    by traffic source. Include recommendations.&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Next delivery: Friday, Mar 13 at 8:00 AM
                  </span>
                </div>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={150}>
            <div>
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
                style={{
                  background: "rgba(16, 163, 127, 0.1)",
                  border: "1px solid rgba(16, 163, 127, 0.3)",
                  color: "var(--accent)",
                }}
              >
                <FileText size={14} />
                Flexible
              </div>
              <h2
                className="mb-4 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Custom Reports
              </h2>
              <p
                className="max-w-md text-lg leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Define exactly what you want to track with natural language
                prompts. Just describe your ideal report and Meaning builds,
                schedules, and delivers it automatically.
              </p>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/*  FEATURES GRID  (2x3)                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="mb-16 text-center">
              <h2
                className="mb-4 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Everything you need in a report
              </h2>
              <p
                className="mx-auto max-w-2xl text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                Automated reports packed with the features that make data
                useful — not just pretty.
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FadeInSection key={f.title} delay={i * 80} className="h-full">
                <div
                  className="relative h-full overflow-hidden rounded-2xl p-6"
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="card-noise" aria-hidden />
                  <div className="relative z-10">
                    <div
                      className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ background: "rgba(16, 163, 127, 0.15)" }}
                    >
                      <f.icon size={20} style={{ color: "var(--accent)" }} />
                    </div>
                    <h3
                      className="mb-2 text-lg font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {f.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {f.description}
                    </p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      <FadeInSection>
        <CtaSection
          heading="Stop building reports. Start reading them."
          description="Set up your first automated report in under two minutes. Meaning handles the rest."
        />
      </FadeInSection>

      <Footer />
    </div>
  );
}
