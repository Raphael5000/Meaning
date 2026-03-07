"use client";

import { Navbar } from "@/components/Navbar";
import { FadeInSection } from "@/components/FadeInSection";
import { CtaSection } from "@/components/CtaSection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Zap, Activity, Clock, Users, TrendingUp, Globe } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Answers",
    description:
      "No waiting for data processing. Ask a question about your live traffic and get an answer in seconds, not hours.",
  },
  {
    icon: Activity,
    title: "Live Metrics",
    description:
      "Active users, page views, events, and conversions updating in real-time so you always know what is happening on your site.",
  },
  {
    icon: TrendingUp,
    title: "Current Campaigns",
    description:
      "See how your campaigns are performing right now. Spot winners early and reallocate budget before opportunities slip away.",
  },
  {
    icon: Globe,
    title: "Peak Detection",
    description:
      "Identify traffic spikes as they happen. Get context on sudden surges so you can respond instantly, not after the fact.",
  },
];

const steps = [
  {
    num: "01",
    icon: Users,
    title: "Connect",
    description: "Link your GA4 property in one click. Meaning syncs with your live data stream automatically.",
  },
  {
    num: "02",
    icon: Clock,
    title: "Ask",
    description:
      "Query your real-time data in plain English. \"How many users are on the site right now?\" Just ask.",
  },
  {
    num: "03",
    icon: Zap,
    title: "Act",
    description:
      "Make decisions with live insights. No more guessing, no more stale reports. Act on what is happening now.",
  },
];

export default function RealTimeAnalyticsPage() {
  return (
    <div className="relative min-h-screen" style={{ background: "var(--page-bg)" }}>
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div
          className="absolute left-1/4 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
          style={{ top: "5%", background: "var(--accent)" }}
        />
        <div
          className="absolute right-1/3 h-80 w-80 rounded-full opacity-[0.06] blur-3xl"
          style={{ top: "35%", background: "#6366f1" }}
        />
        <div
          className="absolute left-1/2 h-72 w-72 rounded-full opacity-[0.08] blur-3xl"
          style={{ top: "65%", background: "var(--accent)" }}
        />
      </div>

      <Navbar />

      {/* ── HERO ── */}
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
            <Activity className="h-3.5 w-3.5" />
            Live Data
          </div>
        </FadeInSection>

        <FadeInSection delay={100}>
          <h1
            className="mx-auto mb-6 max-w-3xl text-4xl leading-tight md:text-6xl"
            style={{ color: "var(--text-primary)" }}
          >
            See what&apos;s happening{" "}
            <span style={{ color: "var(--accent)" }}>right now</span>
          </h1>
        </FadeInSection>

        <FadeInSection delay={200}>
          <p
            className="mx-auto mb-10 max-w-2xl text-lg md:text-xl"
            style={{ color: "var(--text-secondary)" }}
          >
            Live data from GA4, delivered through conversation. No waiting for reports,
            no digging through dashboards. Just ask and know.
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
              <Button variant="outline" className="rounded-full px-8 py-3 text-base font-semibold">
                View pricing
              </Button>
            </Link>
          </div>
        </FadeInSection>
      </section>

      {/* ── LIVE DASHBOARD MOCKUP ── */}
      <section className="relative z-10 px-6 pb-24 md:px-12">
        <FadeInSection>
          <div className="mx-auto max-w-6xl">
            <div
              className="relative overflow-hidden rounded-2xl p-8 md:p-12"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                {/* Header row */}
                <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p
                      className="mb-1 text-sm font-medium uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Real-time overview
                    </p>
                    <div className="flex items-baseline gap-3">
                      <span
                        className="text-5xl font-bold md:text-6xl"
                        style={{ color: "var(--accent)" }}
                      >
                        847
                      </span>
                      <span
                        className="text-lg"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        active users right now
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{
                      background: "rgba(16, 163, 127, 0.15)",
                      color: "var(--accent)",
                    }}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        background: "var(--accent)",
                        boxShadow: "0 0 6px rgba(16,163,127,0.6)",
                        animation: "pulse 2s ease-in-out infinite",
                      }}
                    />
                    Live
                  </div>
                </div>

                {/* Mini stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Page views/min */}
                  <div
                    className="relative overflow-hidden rounded-xl p-5"
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div className="card-noise" aria-hidden />
                    <div className="relative z-10">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Page views / min
                      </p>
                      <p className="mb-3 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                        23
                      </p>
                      {/* Mini bar chart */}
                      <div className="flex items-end gap-1" style={{ height: 32 }}>
                        {[40, 65, 50, 80, 55, 90, 70, 85, 60, 75, 95, 72].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm"
                            style={{
                              height: `${h}%`,
                              background: i === 10 ? "var(--accent)" : "rgba(16,163,127,0.25)",
                              transition: "height 0.3s ease",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Avg session */}
                  <div
                    className="relative overflow-hidden rounded-xl p-5"
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div className="card-noise" aria-hidden />
                    <div className="relative z-10">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Avg session duration
                      </p>
                      <p className="mb-3 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                        2m 14s
                      </p>
                      <div className="flex items-end gap-1" style={{ height: 32 }}>
                        {[30, 45, 60, 55, 70, 50, 65, 80, 75, 60, 55, 70].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm"
                            style={{
                              height: `${h}%`,
                              background: i === 7 ? "#6366f1" : "rgba(99,102,241,0.2)",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top page */}
                  <div
                    className="relative overflow-hidden rounded-xl p-5"
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div className="card-noise" aria-hidden />
                    <div className="relative z-10">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Top page right now
                      </p>
                      <p className="mb-3 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                        /pricing
                      </p>
                      {/* Progress bar style */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                          <span>/pricing</span>
                          <span>312</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(16,163,127,0.1)" }}>
                          <div className="h-full rounded-full" style={{ width: "78%", background: "var(--accent)" }} />
                        </div>
                        <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                          <span>/blog</span>
                          <span>198</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(16,163,127,0.1)" }}>
                          <div className="h-full rounded-full" style={{ width: "49%", background: "rgba(16,163,127,0.4)" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bounce rate */}
                  <div
                    className="relative overflow-hidden rounded-xl p-5"
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div className="card-noise" aria-hidden />
                    <div className="relative z-10">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Events / min
                      </p>
                      <p className="mb-3 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                        58
                      </p>
                      <div className="flex items-end gap-1" style={{ height: 32 }}>
                        {[55, 70, 45, 85, 60, 75, 90, 65, 80, 50, 70, 88].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm"
                            style={{
                              height: `${h}%`,
                              background: i === 11 ? "var(--accent)" : "rgba(16,163,127,0.25)",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="mb-16 text-center">
              <h2
                className="mb-4 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Real-time, redefined
              </h2>
              <p
                className="mx-auto max-w-2xl text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                Your analytics data is always moving. Now you can keep up with it.
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((feature, i) => (
              <FadeInSection key={feature.title} delay={i * 100} className="h-full">
                <div
                  className="relative overflow-hidden rounded-2xl p-8 h-full"
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="card-noise" aria-hidden />
                  <div className="relative z-10">
                    <div
                      className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(16, 163, 127, 0.1)",
                        border: "1px solid rgba(16, 163, 127, 0.2)",
                      }}
                    >
                      <feature.icon className="h-5 w-5" style={{ color: "var(--accent)" }} />
                    </div>
                    <h3
                      className="mb-3 text-xl font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {feature.title}
                    </h3>
                    <p className="leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="mb-16 text-center">
              <div
                className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
                style={{
                  background: "rgba(16, 163, 127, 0.1)",
                  border: "1px solid rgba(16, 163, 127, 0.3)",
                  color: "var(--accent)",
                }}
              >
                How it works
              </div>
              <h2
                className="mb-4 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Three steps to live insights
              </h2>
              <p
                className="mx-auto max-w-2xl text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                From connection to action in under a minute.
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <FadeInSection key={step.title} delay={i * 150} className="h-full">
                <div
                  className="relative overflow-hidden rounded-2xl p-8 h-full"
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="card-noise" aria-hidden />
                  <div className="relative z-10">
                    <span
                      className="mb-4 block text-4xl font-bold"
                      style={{ color: "rgba(16, 163, 127, 0.2)" }}
                    >
                      {step.num}
                    </span>
                    <div
                      className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(16, 163, 127, 0.1)",
                        border: "1px solid rgba(16, 163, 127, 0.2)",
                      }}
                    >
                      <step.icon className="h-5 w-5" style={{ color: "var(--accent)" }} />
                    </div>
                    <h3
                      className="mb-3 text-xl font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {step.description}
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
          heading="Stop looking at yesterday's data"
          description="Start a conversation with your live analytics. See what is happening on your site right now, in plain English."
          secondaryText="Talk to us"
          secondaryHref="/contact"
        />
      </FadeInSection>

      <Footer />
    </div>
  );
}
