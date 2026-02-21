"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronsDown,
  LayoutGrid,
  Lock,
  MessageSquare,
  PieChart,
  Search,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";

function FadeInSection({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`scroll-fade-in ${visible ? "visible" : ""} ${className}`.trim()}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

export default function LandingPage({ onTryBeta }: { onTryBeta: () => void }) {
  return (
    <div
      className="relative min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #050505 0%, #080a09 40%, rgba(16, 163, 127, 0.04) 100%)",
      }}
    >
      {/* Full-page gradient orbs */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
      >
        <div
          className="absolute left-1/4 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
          style={{ top: "10%", background: "var(--accent)" }}
        />
        <div
          className="absolute right-1/4 h-80 w-80 rounded-full opacity-[0.06] blur-3xl"
          style={{ top: "45%", background: "#6366f1" }}
        />
        <div
          className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full opacity-[0.09] blur-3xl"
          style={{ background: "var(--accent)" }}
        />
      </div>

      {/* Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-[15px] md:bg-transparent md:backdrop-blur-none">
        <Navbar />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center">
        <div className="landing-fade-up relative mx-auto max-w-4xl">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
            style={{
              background: "rgba(16, 163, 127, 0.1)",
              border: "1px solid rgba(16, 163, 127, 0.3)",
              color: "var(--accent)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            Now in Beta
          </div>

          <h1
            className="mb-6 text-5xl leading-tight font-bold tracking-tight md:text-7xl md:leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Chat with your
            <br />
            <span style={{ color: "var(--accent)" }}>Google Analytics</span>
            <br />
            data
          </h1>

          <p
            className="mx-auto mb-10 max-w-2xl text-lg md:text-xl"
            style={{ color: "var(--text-secondary)", lineHeight: "1.7" }}
          >
            Meaning turns your Google Analytics properties into a conversational
            interface. Ask questions in plain English and get instant,
            AI-powered insights.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="rounded-full px-8 py-4 text-base font-semibold shadow-[0_0_30px_rgba(16,163,127,0.3)]">
              <a href="/signup">Get started</a>
            </Button>
            <a
              href="/pricing"
              className="text-sm underline-offset-4 hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              View pricing &rarr;
            </a>
          </div>
        </div>

        {/* Hero visual - chat mockup */}
        <div className="landing-fade-up-delay relative z-10 mx-auto mt-16 w-full max-w-3xl px-4">
          <div
            className="overflow-hidden rounded-2xl"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16, 163, 127, 0.1)",
            }}
          >
            {/* Mock title bar */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500 opacity-70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500 opacity-70" />
                <div className="h-3 w-3 rounded-full bg-green-500 opacity-70" />
              </div>
              <span
                className="ml-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Meaning
              </span>
            </div>
            {/* Mock chat content */}
            <div className="p-6">
              <div className="mb-4 flex justify-end">
                <div
                  className="rounded-2xl rounded-br-md px-4 py-2.5 text-sm"
                  style={{
                    background: "var(--user-bubble)",
                    color: "var(--text-primary)",
                    maxWidth: "80%",
                  }}
                >
                  What were my top 5 pages by pageviews last month?
                </div>
              </div>
              <div className="flex justify-start">
                <div
                  className="w-full text-left text-sm"
                  style={{
                    color: "var(--text-secondary)",
                    maxWidth: "85%",
                    lineHeight: "1.7",
                  }}
                >
                  <p style={{ color: "var(--text-primary)", marginBottom: "8px" }}>
                    Here are your top 5 pages by pageviews for last month:
                  </p>
                  <div
                    className="overflow-hidden rounded-lg text-left text-xs"
                    style={{ border: "1px solid var(--border-color)" }}
                  >
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ background: "var(--bg-tertiary)" }}>
                          <th
                            className="px-3 py-2 text-left font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            Page
                          </th>
                          <th
                            className="px-3 py-2 text-right font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            Views
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["/", "12,847"],
                          ["/pricing", "8,234"],
                          ["/blog/getting-started", "6,102"],
                          ["/features", "4,891"],
                          ["/docs/api", "3,456"],
                        ].map(([page, views], i) => (
                          <tr
                            key={i}
                            style={{
                              borderTop: "1px solid var(--border-color)",
                            }}
                          >
                            <td
                              className="px-3 py-2 text-left"
                              style={{ color: "var(--accent)" }}
                            >
                              {page}
                            </td>
                            <td
                              className="px-3 py-2 text-right"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {views}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="landing-bounce absolute bottom-8 z-10">
          <ChevronsDown className="h-6 w-6 text-muted-foreground" />
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="mb-16 text-center">
              <h2
                className="mb-4 text-3xl font-bold md:text-5xl"
                style={{ color: "var(--text-primary)" }}
              >
                Everything you need to
                <br />
                <span style={{ color: "var(--accent)" }}>
                  understand your data
                </span>
              </h2>
              <p
                className="mx-auto max-w-2xl text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                Stop digging through dashboards. Ask Meaning anything about your
                analytics and get clear, actionable answers.
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FadeInSection delay={0}>
              <FeatureCard
                icon={<Search className="h-6 w-6" />}
                title="Natural Language Queries"
                description="Ask questions in plain English. No need to learn complex query languages or navigate confusing dashboards."
              />
            </FadeInSection>

            <FadeInSection delay={80}>
              <FeatureCard
                icon={<Zap className="h-6 w-6" />}
                title="Real-time Analytics"
                description="Get live data from your Google Analytics properties. See what's happening on your site right now."
              />
            </FadeInSection>

            <FadeInSection delay={160}>
              <FeatureCard
                icon={<PieChart className="h-6 w-6" />}
                title="Instant Insights"
                description="AI-powered analysis that surfaces the metrics that matter. Get summaries, trends, and recommendations."
              />
            </FadeInSection>

            <FadeInSection delay={240}>
              <FeatureCard
                icon={<LayoutGrid className="h-6 w-6" />}
                title="GA4 Integration"
                description="Connects directly to your Google Analytics 4 properties. Switch between multiple properties seamlessly."
              />
            </FadeInSection>

            <FadeInSection delay={320}>
              <FeatureCard
                icon={<Lock className="h-6 w-6" />}
                title="Privacy First"
                description="We only request read-only access to your analytics. Your data is never stored or used for training."
              />
            </FadeInSection>

            <FadeInSection delay={400}>
              <FeatureCard
                icon={<MessageSquare className="h-6 w-6" />}
                title="Conversational Interface"
                description="Have a natural conversation with your data. Ask follow-ups, dive deeper, and explore your metrics intuitively."
              />
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-4xl">
          <FadeInSection>
            <div className="mb-16 text-center">
              <h2
                className="mb-4 text-3xl font-bold md:text-5xl"
                style={{ color: "var(--text-primary)" }}
              >
                How it works
              </h2>
              <p
                className="mx-auto max-w-2xl text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                Get started in seconds. No setup, no configuration.
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-8 md:grid-cols-3">
            <FadeInSection delay={0}>
              <StepCard
                number="1"
                title="Sign in with Google"
                description="Connect your Google account with read-only analytics access."
              />
            </FadeInSection>
            <FadeInSection delay={120}>
              <StepCard
                number="2"
                title="Select your property"
                description="Choose which GA4 property you want to explore."
              />
            </FadeInSection>
            <FadeInSection delay={240}>
              <StepCard
                number="3"
                title="Start asking questions"
                description="Type your question in plain English and get instant answers."
              />
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 md:px-12">
        <FadeInSection>
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="rounded-3xl p-12 md:p-16"
            style={{
              background:
                "linear-gradient(135deg, rgba(16, 163, 127, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)",
              border: "1px solid rgba(16, 163, 127, 0.2)",
            }}
          >
            <h2
              className="mb-4 text-3xl font-bold md:text-4xl"
              style={{ color: "var(--text-primary)" }}
            >
              Ready to talk to your data?
            </h2>
            <p
              className="mx-auto mb-8 max-w-lg text-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              Join the beta and start getting insights from your Google Analytics
              data in seconds.
            </p>
            <Button asChild size="lg" className="rounded-full px-8 py-4 text-base font-semibold shadow-[0_0_30px_rgba(16,163,127,0.3)]">
              <a href="/signup">Get started</a>
            </Button>
          </div>
        </div>
        </FadeInSection>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-3xl">
          <FadeInSection>
            <div className="mb-12 text-center">
              <div
                className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
                style={{
                  background: "rgba(16, 163, 127, 0.1)",
                  border: "1px solid rgba(16, 163, 127, 0.3)",
                  color: "var(--accent)",
                }}
              >
                FAQ
              </div>
              <h2
                className="text-3xl font-bold md:text-5xl"
                style={{ color: "var(--text-primary)" }}
              >
                Frequently Asked Questions
              </h2>
            </div>
          </FadeInSection>

          <div className="flex flex-col gap-4">
            <FadeInSection delay={0}>
              <FaqItem
                question="How does Meaning work?"
                answer="Meaning connects to your Google Analytics 4 properties using read-only access. You ask questions in plain English, and our AI translates them into the right analytics queries, then presents the results in a clear, conversational format."
              />
            </FadeInSection>
            <FadeInSection delay={80}>
              <FaqItem
                question="Is my analytics data stored or shared?"
                answer="No. Meaning only requests read-only access to your Google Analytics data. Your data is queried in real time and is never stored on our servers or shared with third parties."
              />
            </FadeInSection>
            <FadeInSection delay={160}>
              <FaqItem
                question="Does my personal data get accessed by Meaning or any third parties?"
                answer="We only access the Google Analytics data you explicitly grant us permission to read. We do not access personal files, emails, or any other Google account data. The AI processes your queries securely and does not retain conversation history between sessions."
              />
            </FadeInSection>
            <FadeInSection delay={240}>
              <FaqItem
                question="What LLM does Meaning use?"
                answer="Meaning is powered by Anthropic's Claude, one of the most capable and safety-focused large language models available. This allows us to provide accurate, nuanced interpretations of your analytics data while maintaining the highest standards of data privacy and security."
              />
            </FadeInSection>
          </div>

          <p
            className="mt-8 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Still have a question?{" "}
            <a
              href="mailto:artemis@hivory.io"
              style={{ color: "var(--accent)" }}
              className="underline-offset-4 hover:underline"
            >
              Email us
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <FadeInSection>
      <footer
        className="px-6 py-8 md:px-12"
        style={{ borderTop: "1px solid var(--border-color)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/Logo.svg"
              alt="Meaning"
              width={90}
              height={32}
              className="h-6 w-auto"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
            <Link href="/privacy" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Terms
            </Link>
            <span>Copyright © 2026 - All rights reserved | A product by Hivory</span>
          </div>
        </div>
      </footer>
      </FadeInSection>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="landing-feature-card relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
      style={{
        background:
          "linear-gradient(145deg, rgba(20, 24, 23, 0.98) 0%, rgba(15, 22, 20, 0.99) 45%, rgba(16, 163, 127, 0.06) 100%)",
        border: "1px solid var(--border-color)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(16, 163, 127, 0.4)";
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow =
          "0 10px 40px rgba(0,0,0,0.3), 0 0 20px rgba(16, 163, 127, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-color)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="card-noise" aria-hidden />
      <div className="relative z-10">
        <div
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
          style={{
            background: "rgba(16, 163, 127, 0.1)",
            color: "var(--accent)",
          }}
        >
          {icon}
        </div>
        <h3
          className="mb-2 text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
        style={{
          background: "rgba(16, 163, 127, 0.1)",
          color: "var(--accent)",
          border: "2px solid rgba(16, 163, 127, 0.3)",
        }}
      >
        {number}
      </div>
      <h3
        className="mb-2 text-lg font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>
    </div>
  );
}

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-300"
      style={{
        background:
          "linear-gradient(145deg, rgba(20, 24, 23, 0.98) 0%, rgba(15, 22, 20, 0.99) 45%, rgba(16, 163, 127, 0.06) 100%)",
        border: "1px solid var(--border-color)",
      }}
      onClick={() => setOpen(!open)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(16, 163, 127, 0.4)";
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow =
          "0 10px 40px rgba(0,0,0,0.3), 0 0 20px rgba(16, 163, 127, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-color)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="card-noise" aria-hidden />
      <div className="relative z-10">
        <div className="flex items-center justify-between px-6 py-5">
          <span
            className="text-base font-medium md:text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            {question}
          </span>
          <span
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center text-xl transition-transform duration-300"
            style={{
              color: "var(--text-muted)",
              transform: open ? "rotate(45deg)" : "rotate(0deg)",
            }}
          >
            +
          </span>
        </div>
        <div
          className="transition-all duration-300 ease-in-out"
          style={{
            maxHeight: open ? "200px" : "0",
            opacity: open ? 1 : 0,
          }}
        >
          <p
            className="px-6 pb-5 text-sm leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
