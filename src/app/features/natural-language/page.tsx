"use client";

import { Navbar } from "@/components/Navbar";
import { FadeInSection } from "@/components/FadeInSection";
import { CtaSection } from "@/components/CtaSection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Sparkles,
  ArrowRight,
  Globe,
  Zap,
} from "lucide-react";

export default function NaturalLanguagePage() {
  return (
    <div
      className="relative min-h-screen"
      style={{ background: "var(--page-bg)" }}
    >
      {/* Background orbs */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute left-1/4 h-[500px] w-[500px] rounded-full opacity-[0.10] blur-3xl"
          style={{ top: "5%", background: "var(--accent)" }}
        />
        <div
          className="absolute right-1/4 h-96 w-96 rounded-full opacity-[0.06] blur-3xl"
          style={{ top: "35%", background: "#6366f1" }}
        />
        <div
          className="absolute left-1/3 h-80 w-80 rounded-full opacity-[0.08] blur-3xl"
          style={{ top: "65%", background: "var(--accent)" }}
        />
        <div
          className="absolute right-1/3 h-72 w-72 rounded-full opacity-[0.06] blur-3xl"
          style={{ top: "85%", background: "#6366f1" }}
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
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            Core Feature
          </div>
        </FadeInSection>

        <FadeInSection delay={100}>
          <h1
            className="mx-auto mb-6 max-w-4xl text-4xl leading-tight md:text-6xl"
            style={{ color: "var(--text-primary)" }}
          >
            Ask{" "}
            <span style={{ color: "var(--accent)" }}>anything</span> about
            your data
          </h1>
        </FadeInSection>

        <FadeInSection delay={200}>
          <p
            className="mx-auto mb-10 max-w-2xl text-lg md:text-xl"
            style={{ color: "var(--text-secondary)" }}
          >
            Ask questions in plain English and get instant answers. No SQL, no
            complex dashboards, no learning curve. Just you and your data,
            talking naturally.
          </p>
        </FadeInSection>

        <FadeInSection delay={300}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="rounded-full px-8 py-3 text-base font-semibold">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
            >
              View pricing
            </Link>
          </div>
        </FadeInSection>
      </section>

      {/* ── DEMO SECTION ── */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          {/* Text */}
          <FadeInSection>
            <div>
              <h2
                className="mb-4 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Just type your question
              </h2>
              <p
                className="mb-6 text-lg leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Meaning gives you a conversational interface to your Google
                Analytics data. Type a question the way you would ask a
                colleague, and get a clear, data-backed answer in seconds.
              </p>
              <p
                className="text-base leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                No training required. No complicated filters. If you can
                describe what you want to know, Meaning can answer it.
              </p>
            </div>
          </FadeInSection>

          {/* Mock chat UI */}
          <FadeInSection delay={200}>
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10 flex flex-col gap-4">
                {/* Chat header */}
                <div className="flex items-center gap-2 pb-3" style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <MessageSquare className="h-4 w-4" style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Meaning Chat
                  </span>
                  <span
                    className="ml-auto inline-block h-2 w-2 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                </div>

                {/* User message */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-primary)",
                    }}
                  >
                    What were my top pages last week?
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div
                    className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed"
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                      borderLeft: "3px solid var(--accent)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <p className="mb-2">
                      Here are your <strong style={{ color: "var(--text-primary)" }}>top 5 pages</strong> from the past 7 days:
                    </p>
                    <ol className="mb-2 flex flex-col gap-1 pl-4 text-xs" style={{ color: "var(--text-muted)" }}>
                      <li>1. /blog/analytics-tips — <span style={{ color: "var(--accent)" }}>2,841 views</span></li>
                      <li>2. /pricing — <span style={{ color: "var(--accent)" }}>1,923 views</span></li>
                      <li>3. /features — <span style={{ color: "var(--accent)" }}>1,547 views</span></li>
                      <li>4. /blog/seo-guide — <span style={{ color: "var(--accent)" }}>1,210 views</span></li>
                      <li>5. /home — <span style={{ color: "var(--accent)" }}>1,089 views</span></li>
                    </ol>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Your blog content is driving the most traffic. Want me to break this down by traffic source?
                    </p>
                  </div>
                </div>

                {/* Typing indicator */}
                <div className="flex items-center gap-1.5 pl-1">
                  <div
                    className="h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: "var(--accent)", animationDelay: "0ms" }}
                  />
                  <div
                    className="h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: "var(--accent)", animationDelay: "150ms" }}
                  />
                  <div
                    className="h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: "var(--accent)", animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ── CAPABILITIES SECTION ── */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="mb-16 text-center">
              <h2
                className="mb-4 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Understands what you mean
              </h2>
              <p
                className="mx-auto max-w-2xl text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                From simple metrics to complex comparisons, Meaning parses your
                intent and delivers exactly the data you need.
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Any Metric",
                description:
                  "Ask about sessions, users, bounce rate, conversions, page views, and any other GA4 metric.",
              },
              {
                icon: Sparkles,
                title: "Date Ranges",
                description:
                  'Natural date parsing understands "last Tuesday", "past 90 days", "Q3 2025", and everything in between.',
              },
              {
                icon: Zap,
                title: "Comparisons",
                description:
                  '"Compare this month vs last month" or "How did traffic change year over year?" — answered instantly.',
              },
              {
                icon: Globe,
                title: "Segmentation",
                description:
                  "Break down results by device, country, traffic source, landing page, or any available dimension.",
              },
              {
                icon: MessageSquare,
                title: "Multi-property",
                description:
                  "Query across multiple GA4 properties at once. Compare sites, roll up data, or deep-dive into one.",
              },
              {
                icon: ArrowRight,
                title: "Follow-ups",
                description:
                  'Refine your questions naturally. Say "Now filter to mobile only" or "Show me just organic" to drill down.',
              },
            ].map((item, i) => (
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
                      className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(16, 163, 127, 0.1)",
                        border: "1px solid rgba(16, 163, 127, 0.2)",
                      }}
                    >
                      <item.icon
                        className="h-5 w-5"
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
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXAMPLE QUERIES SECTION ── */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          {/* Visual — example queries list */}
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
              <div className="relative z-10 flex flex-col gap-3">
                <div className="mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4" style={{ color: "var(--accent)" }} />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Try asking...
                  </span>
                </div>
                {[
                  "What's my bounce rate on mobile?",
                  "Show me traffic from Google Ads last quarter",
                  "Which landing pages convert best?",
                  "Compare organic vs paid traffic this year",
                  "What country drives the most revenue?",
                  "How did signups change after the redesign?",
                ].map((query, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                    style={{
                      background:
                        i % 2 === 0
                          ? "rgba(16, 163, 127, 0.04)"
                          : "transparent",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <MessageSquare
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--accent)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {query}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>

          {/* Text */}
          <FadeInSection delay={200}>
            <div>
              <h2
                className="mb-4 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Ask the questions that matter
              </h2>
              <p
                className="mb-6 text-lg leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Stop clicking through reports trying to find the right filter
                combination. Just describe what you want to know, and Meaning
                delivers a clear, actionable answer.
              </p>
              <p
                className="mb-8 text-base leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                From high-level performance overviews to granular breakdowns by
                device, geography, or campaign — every question gets a precise
                response backed by your real GA4 data.
              </p>
              <Link href="/signup">
                <Button className="rounded-full px-8 py-3 text-base font-semibold">
                  Try it now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>

      <FadeInSection>
        <CtaSection
          heading="Ready to talk to your data?"
          description="Start asking questions in plain English and uncover insights you never knew were there."
        />
      </FadeInSection>

      <Footer />
    </div>
  );
}
