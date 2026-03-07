"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { FadeInSection } from "@/components/FadeInSection";
import { CtaSection } from "@/components/CtaSection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Mail,
  Calendar,
  BarChart3,
  FileText,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Alert-type cards data                                              */
/* ------------------------------------------------------------------ */
const alertTypes = [
  {
    icon: BarChart3,
    title: "Weekly Snapshot",
    description:
      "A concise traffic summary with AI-powered recommendations delivered every Monday morning.",
    snippet: '"Sessions are up 12% week-over-week. Consider doubling down on the /blog/ga4-guide page."',
  },
  {
    icon: Mail,
    title: "Traffic Report",
    description:
      "Detailed breakdown by source, medium, and channel so you know exactly where visitors come from.",
    snippet: '"Organic: 4 210 sessions (+9%) | Direct: 1 830 (+2%) | Referral: 620 (-4%)"',
  },
  {
    icon: FileText,
    title: "Top Pages",
    description:
      "Your highest-performing pages ranked by views, engagement rate, and average session duration.",
    snippet: '"1. /blog/ga4-guide — 1 420 views, 72% engagement | 2. /pricing — 980 views"',
  },
  {
    icon: Sparkles,
    title: "Custom Reports",
    description:
      "Define your own prompts and Meaning will generate a personalised report on your schedule.",
    snippet: '"Prompt: Compare this week\'s organic traffic to last week and flag anomalies."',
  },
];

/* ------------------------------------------------------------------ */
/*  Days-of-week toggle data                                           */
/* ------------------------------------------------------------------ */
const days = [
  { label: "Mon", active: true },
  { label: "Tue", active: false },
  { label: "Wed", active: false },
  { label: "Thu", active: true },
  { label: "Fri", active: false },
  { label: "Sat", active: false },
  { label: "Sun", active: false },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function EmailAlertsPage() {
  return (
    <div
      className="relative min-h-screen"
      style={{ background: "var(--page-bg)" }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div
          className="absolute left-1/4 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
          style={{ top: "5%", background: "var(--accent)" }}
        />
        <div
          className="absolute right-1/4 h-80 w-80 rounded-full opacity-[0.06] blur-3xl"
          style={{ top: "30%", background: "#6366f1" }}
        />
        <div
          className="absolute left-1/3 h-72 w-72 rounded-full opacity-[0.08] blur-3xl"
          style={{ top: "60%", background: "var(--accent)" }}
        />
        <div
          className="absolute right-1/3 h-64 w-64 rounded-full opacity-[0.05] blur-3xl"
          style={{ top: "85%", background: "#6366f1" }}
        />
      </div>

      <Navbar />

      {/* ──────────────── HERO ──────────────── */}
      <section className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center md:px-12">
        <FadeInSection>
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
            style={{
              background: "rgba(16, 163, 127, 0.1)",
              border: "1px solid rgba(16, 163, 127, 0.3)",
              color: "var(--accent)",
            }}
          >
            <Bell size={14} />
            Stay Informed
          </div>

          <h1
            className="mb-4 text-4xl md:text-5xl lg:text-6xl"
            style={{ color: "var(--text-primary)" }}
          >
            Your analytics,{" "}
            <span style={{ color: "var(--accent)" }}>delivered</span>
          </h1>

          <p
            className="mx-auto mb-10 max-w-2xl text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Automated reports and AI-powered alerts straight to your inbox — so
            you never miss what matters.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="rounded-full px-8 py-3 text-base font-semibold">Get started free</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="rounded-full px-8 py-3 text-base font-semibold">
                View pricing
              </Button>
            </Link>
          </div>
        </FadeInSection>
      </section>

      {/* ──────────────── EMAIL PREVIEW MOCKUP ──────────────── */}
      <section className="relative z-10 px-6 pb-24 md:px-12">
        <div className="mx-auto max-w-2xl">
          <FadeInSection>
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                {/* Email header */}
                <div
                  className="flex items-center gap-3 px-6 py-4"
                  style={{ borderBottom: "1px solid var(--border-color)" }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: "rgba(16, 163, 127, 0.15)" }}
                  >
                    <Mail size={14} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Meaning Analytics
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      alerts@meaning.bot
                    </p>
                  </div>
                  <span
                    className="ml-auto text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Mon 9:00 AM
                  </span>
                </div>

                {/* Subject */}
                <div className="px-6 pt-5 pb-3">
                  <p
                    className="text-base font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Weekly Snapshot — Mar 1 – Mar 7
                  </p>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-4 px-6 pb-5">
                  {[
                    { label: "Sessions", value: "4,210", change: "+12%", up: true },
                    { label: "Users", value: "3,080", change: "+8%", up: true },
                    { label: "Bounce Rate", value: "42%", change: "-3%", up: false },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg p-3 text-center"
                      style={{
                        background: "rgba(16, 163, 127, 0.05)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {m.label}
                      </p>
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {m.value}
                      </p>
                      <p
                        className="text-xs font-medium"
                        style={{
                          color: m.label === "Bounce Rate"
                            ? "var(--accent)"
                            : m.up
                              ? "var(--accent)"
                              : "#ef4444",
                        }}
                      >
                        {m.change}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Top page */}
                <div
                  className="mx-6 mb-4 rounded-lg px-4 py-3"
                  style={{
                    background: "rgba(16, 163, 127, 0.05)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Top performing page
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    /blog/ga4-guide
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    1,420 views &middot; 72% engagement rate
                  </p>
                </div>

                {/* AI recommendation */}
                <div
                  className="mx-6 mb-6 rounded-lg px-4 py-3"
                  style={{
                    background: "rgba(16, 163, 127, 0.08)",
                    border: "1px solid rgba(16, 163, 127, 0.2)",
                  }}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <Sparkles
                      size={12}
                      style={{ color: "var(--accent)" }}
                    />
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "var(--accent)" }}
                    >
                      AI Recommendation
                    </p>
                  </div>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Your GA4 guide is driving the most engagement. Consider
                    creating related content around GA4 event tracking to
                    capture similar search intent.
                  </p>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ──────────────── ALERT TYPES ──────────────── */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="mb-14 text-center">
              <h2
                className="mb-3 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Reports tailored to{" "}
                <span style={{ color: "var(--accent)" }}>your needs</span>
              </h2>
              <p
                className="mx-auto max-w-xl text-base"
                style={{ color: "var(--text-secondary)" }}
              >
                Choose from ready-made report types or craft your own — Meaning
                handles the rest.
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-6 sm:grid-cols-2">
            {alertTypes.map((item, i) => (
              <FadeInSection key={item.title} delay={i * 100} className="h-full">
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
                      style={{
                        background: "rgba(16, 163, 127, 0.1)",
                        border: "1px solid rgba(16, 163, 127, 0.2)",
                      }}
                    >
                      <item.icon
                        size={18}
                        style={{ color: "var(--accent)" }}
                      />
                    </div>

                    <h3
                      className="mb-2 text-lg font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="mb-4 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.description}
                    </p>

                    <div
                      className="rounded-lg px-4 py-3"
                      style={{
                        background: "rgba(16, 163, 127, 0.05)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <p
                        className="text-xs italic"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {item.snippet}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── HOW IT WORKS ──────────────── */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="mb-14 text-center">
              <h2
                className="mb-3 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Set it and{" "}
                <span style={{ color: "var(--accent)" }}>forget it</span>
              </h2>
              <p
                className="mx-auto max-w-xl text-base"
                style={{ color: "var(--text-secondary)" }}
              >
                Schedule your reports in seconds. Pick the days, choose the
                metrics, and let Meaning do the rest.
              </p>
            </div>
          </FadeInSection>

          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Left — text */}
            <FadeInSection>
              <div>
                <ul className="flex flex-col gap-6">
                  {[
                    {
                      icon: Calendar,
                      title: "Pick your schedule",
                      desc: "Choose daily, weekly, or specific days of the week to receive your reports.",
                    },
                    {
                      icon: BarChart3,
                      title: "Select your metrics",
                      desc: "Sessions, users, bounce rate, top pages — include exactly what you need.",
                    },
                    {
                      icon: Sparkles,
                      title: "Get AI insights",
                      desc: "Every report includes AI-generated recommendations based on your latest data.",
                    },
                  ].map((step) => (
                    <li key={step.title} className="flex gap-4">
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: "rgba(16, 163, 127, 0.1)",
                          border: "1px solid rgba(16, 163, 127, 0.2)",
                        }}
                      >
                        <step.icon
                          size={18}
                          style={{ color: "var(--accent)" }}
                        />
                      </div>
                      <div>
                        <p
                          className="mb-1 text-sm font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {step.title}
                        </p>
                        <p
                          className="text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {step.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInSection>

            {/* Right — mock schedule UI */}
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
                  <p
                    className="mb-1 text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Schedule
                  </p>
                  <p
                    className="mb-5 text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Weekly Snapshot — Delivery Days
                  </p>

                  <div className="mb-6 flex flex-wrap gap-2">
                    {days.map((d) => (
                      <div
                        key={d.label}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-medium transition-colors"
                        style={{
                          background: d.active
                            ? "var(--accent)"
                            : "rgba(16, 163, 127, 0.08)",
                          color: d.active ? "#fff" : "var(--text-secondary)",
                          border: d.active
                            ? "1px solid var(--accent)"
                            : "1px solid var(--border-color)",
                        }}
                      >
                        {d.label}
                      </div>
                    ))}
                  </div>

                  <div
                    className="mb-4 flex items-center justify-between rounded-lg px-4 py-3"
                    style={{
                      background: "rgba(16, 163, 127, 0.05)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Delivery time
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      09:00 AM
                    </span>
                  </div>

                  <div
                    className="flex items-center justify-between rounded-lg px-4 py-3"
                    style={{
                      background: "rgba(16, 163, 127, 0.05)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Include AI insights
                    </span>
                    <div
                      className="flex h-5 w-9 items-center rounded-full px-0.5"
                      style={{ background: "var(--accent)" }}
                    >
                      <div className="ml-auto h-4 w-4 rounded-full bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ──────────────── CUSTOM PROMPTS ──────────────── */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="mb-14 text-center">
              <h2
                className="mb-3 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Your prompt,{" "}
                <span style={{ color: "var(--accent)" }}>your report</span>
              </h2>
              <p
                className="mx-auto max-w-xl text-base"
                style={{ color: "var(--text-secondary)" }}
              >
                Write a plain-English prompt and Meaning will turn it into a
                recurring, AI-generated report.
              </p>
            </div>
          </FadeInSection>

          <div className="grid items-start gap-6 md:grid-cols-2">
            {/* Prompt input mock */}
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
                    className="mb-1 text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Custom Prompt
                  </p>
                  <p
                    className="mb-4 text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Define what you want to know
                  </p>
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{
                      background: "rgba(16, 163, 127, 0.05)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      &ldquo;Compare this week&rsquo;s organic traffic to last
                      week and highlight any anomalies.&rdquo;
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                      style={{
                        background: "rgba(16, 163, 127, 0.1)",
                        border: "1px solid rgba(16, 163, 127, 0.3)",
                        color: "var(--accent)",
                      }}
                    >
                      <Calendar size={10} />
                      Every Monday
                    </div>
                    <div
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                      style={{
                        background: "rgba(16, 163, 127, 0.1)",
                        border: "1px solid rgba(16, 163, 127, 0.3)",
                        color: "var(--accent)",
                      }}
                    >
                      <Mail size={10} />
                      Email
                    </div>
                  </div>
                </div>
              </div>
            </FadeInSection>

            {/* AI output mock */}
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
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles
                      size={14}
                      style={{ color: "var(--accent)" }}
                    />
                    <p
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--accent)" }}
                    >
                      AI-Generated Report
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div
                      className="rounded-lg px-4 py-3"
                      style={{
                        background: "rgba(16, 163, 127, 0.05)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <p
                        className="mb-1 text-xs font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Organic Traffic Comparison
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        This week: <strong>2,840</strong> sessions &middot; Last
                        week: <strong>2,510</strong> sessions
                      </p>
                      <p
                        className="mt-1 text-xs font-medium"
                        style={{ color: "var(--accent)" }}
                      >
                        +13.1% week-over-week
                      </p>
                    </div>

                    <div
                      className="rounded-lg px-4 py-3"
                      style={{
                        background: "rgba(16, 163, 127, 0.05)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <p
                        className="mb-1 text-xs font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Anomaly Detected
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Traffic from Google Search spiked 42% on Thursday.
                        The page <strong>/blog/ga4-guide</strong> received
                        3x its usual daily visits, possibly due to a featured
                        snippet.
                      </p>
                    </div>

                    <div
                      className="rounded-lg px-4 py-3"
                      style={{
                        background: "rgba(16, 163, 127, 0.08)",
                        border: "1px solid rgba(16, 163, 127, 0.2)",
                      }}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <Sparkles
                          size={10}
                          style={{ color: "var(--accent)" }}
                        />
                        <p
                          className="text-xs font-semibold"
                          style={{ color: "var(--accent)" }}
                        >
                          Recommendation
                        </p>
                      </div>
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Monitor the GA4 guide for continued momentum.
                        Internally link related posts to capture the extra
                        traffic.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      <FadeInSection>
        <CtaSection
          heading="Never check a dashboard again"
          description="Let your analytics come to you. Set up email alerts in under a minute and start every week with clarity."
        />
      </FadeInSection>

      <Footer />
    </div>
  );
}
