"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  ChevronsDown,
  Globe,
  LayoutGrid,
  LineChart,
  Lock,
  Mail,
  MessageSquare,
  PieChart,
  Search,
  Users,
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
      className="relative min-h-screen overflow-x-hidden"
      style={{
        background:
          "var(--page-bg)",
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
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-[15px] dark:bg-black/50 md:bg-transparent md:backdrop-blur-none md:dark:bg-transparent">
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
            Your GA4
            <br />
            <span style={{ color: "var(--accent)" }}>AI chatbot</span>
            <br />
            for Google Analytics
          </h1>

          <p
            className="mx-auto mb-10 max-w-2xl text-lg md:text-xl"
            style={{ color: "var(--text-secondary)", lineHeight: "1.7" }}
          >
            The natural language analytics platform for GA4. Ask questions in
            plain English, visualize trends, set up automated alerts, and
            collaborate with your team — no dashboards, no coding needed.
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
              boxShadow: "var(--shadow-card)",
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
                icon={<BarChart3 className="h-6 w-6" />}
                title="Rich Visualizations"
                description="Get AI-generated charts and graphs. Bar, line, pie, scatter, funnel, treemaps, geographic maps, and more."
              />
            </FadeInSection>

            <FadeInSection delay={240}>
              <FeatureCard
                icon={<Bell className="h-6 w-6" />}
                title="Automated Email Alerts"
                description="Schedule weekly snapshots, traffic reports, and custom reports delivered straight to your inbox."
              />
            </FadeInSection>

            <FadeInSection delay={320}>
              <FeatureCard
                icon={<Users className="h-6 w-6" />}
                title="Team Collaboration"
                description="Invite team members, assign roles, and control access to specific analytics properties."
              />
            </FadeInSection>

            <FadeInSection delay={400}>
              <FeatureCard
                icon={<Lock className="h-6 w-6" />}
                title="Privacy First"
                description="We only request read-only access to your analytics. Your data is never stored or used for training."
              />
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Visualizations Section */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <FadeInSection>
              <div>
                <div
                  className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
                  style={{
                    background: "rgba(16, 163, 127, 0.1)",
                    border: "1px solid rgba(16, 163, 127, 0.3)",
                    color: "var(--accent)",
                  }}
                >
                  Visualizations
                </div>
                <h2
                  className="mb-4 text-3xl font-bold md:text-4xl"
                  style={{ color: "var(--text-primary)" }}
                >
                  See your data,{" "}
                  <span style={{ color: "var(--accent)" }}>not just read it</span>
                </h2>
                <p
                  className="mb-6 text-lg leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Meaning automatically generates the right chart for your question.
                  From simple bar charts to geographic heatmaps, every visualization
                  is tailored to your data.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Bar Charts",
                    "Line Charts",
                    "Pie Charts",
                    "Scatter Plots",
                    "Funnels",
                    "Treemaps",
                    "Heatmaps",
                    "Geographic Maps",
                    "Radar Charts",
                    "Sankey Diagrams",
                  ].map((type) => (
                    <span
                      key={type}
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{
                        background: "var(--bg-tertiary)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </FadeInSection>

            <FadeInSection delay={120}>
              <div
                className="overflow-hidden rounded-2xl p-6"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="card-noise" aria-hidden />
                {/* Mock bar chart visualization */}
                <div className="relative z-10">
                  <p
                    className="mb-4 text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Sessions by Channel (Last 30 days)
                  </p>
                  <div className="flex items-end gap-3" style={{ height: "180px" }}>
                    {[
                      { label: "Organic", h: 180, value: "4.2k" },
                      { label: "Direct", h: 130, value: "3.0k" },
                      { label: "Referral", h: 86, value: "2.0k" },
                      { label: "Social", h: 65, value: "1.5k" },
                      { label: "Email", h: 43, value: "1.0k" },
                      { label: "Paid", h: 32, value: "756" },
                    ].map((bar) => (
                      <div key={bar.label} className="flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
                        <span
                          className="mb-1 text-xs font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {bar.value}
                        </span>
                        <div
                          className="w-full rounded-t-md"
                          style={{
                            height: `${bar.h}px`,
                            background: "linear-gradient(180deg, var(--accent) 0%, rgba(16, 163, 127, 0.6) 100%)",
                          }}
                        />
                        <span
                          className="mt-1 text-[10px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {bar.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Alerts Section */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <FadeInSection delay={120} className="order-2 md:order-1">
              <div
                className="overflow-hidden rounded-2xl p-6"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="card-noise" aria-hidden />
                {/* Mock alert cards */}
                <div className="relative z-10 flex flex-col gap-3">
                  {[
                    {
                      type: "Weekly Snapshot",
                      desc: "Traffic summary vs last week with recommendations",
                      icon: <PieChart className="h-4 w-4" />,
                      color: "var(--accent)",
                    },
                    {
                      type: "Traffic Report",
                      desc: "Breakdown by source, medium, and channel",
                      icon: <LineChart className="h-4 w-4" />,
                      color: "var(--accent)",
                    },
                    {
                      type: "Top Pages",
                      desc: "Best performers ranked by views and engagement",
                      icon: <BarChart3 className="h-4 w-4" />,
                      color: "var(--accent)",
                    },
                    {
                      type: "Custom Report",
                      desc: "Define your own prompt for personalized insights",
                      icon: <Mail className="h-4 w-4" />,
                      color: "var(--accent)",
                    },
                  ].map((alert) => (
                    <div
                      key={alert.type}
                      className="flex items-start gap-3 rounded-xl p-3"
                      style={{
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: `${alert.color}15`,
                          color: alert.color,
                        }}
                      >
                        {alert.icon}
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {alert.type}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {alert.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>

            <FadeInSection className="order-1 md:order-2">
              <div>
                <div
                  className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
                  style={{
                    background: "rgba(16, 163, 127, 0.1)",
                    border: "1px solid rgba(16, 163, 127, 0.3)",
                    color: "var(--accent)",
                  }}
                >
                  Email Alerts
                </div>
                <h2
                  className="mb-4 text-3xl font-bold md:text-4xl"
                  style={{ color: "var(--text-primary)" }}
                >
                  Insights delivered{" "}
                  <span style={{ color: "var(--accent)" }}>on your schedule</span>
                </h2>
                <p
                  className="mb-6 text-lg leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Set up automated email reports and never miss a trend. Choose from
                  pre-built report types or create custom reports with your own prompts.
                  Schedule them weekly, bi-weekly, or monthly.
                </p>
                <ul className="flex flex-col gap-2">
                  {[
                    "Pick specific days and times for delivery",
                    "Send to multiple recipients",
                    "AI-generated summaries with recommendations",
                    "Test any alert before scheduling",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: "var(--accent)" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Team Management Section */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <FadeInSection>
              <div>
                <div
                  className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
                  style={{
                    background: "rgba(16, 163, 127, 0.1)",
                    border: "1px solid rgba(16, 163, 127, 0.3)",
                    color: "var(--accent)",
                  }}
                >
                  Teams
                </div>
                <h2
                  className="mb-4 text-3xl font-bold md:text-4xl"
                  style={{ color: "var(--text-primary)" }}
                >
                  Built for{" "}
                  <span style={{ color: "var(--accent)" }}>teams</span>
                </h2>
                <p
                  className="mb-6 text-lg leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Invite your team and give everyone access to the analytics they
                  need. Assign roles, control which properties each member can see,
                  and manage seats from one place.
                </p>
                <ul className="flex flex-col gap-2">
                  {[
                    "Invite members with email-based invitations",
                    "Admin and member roles",
                    "Property-level access control",
                    "Seat-based billing with flexible management",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: "var(--accent)" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInSection>

            <FadeInSection delay={120}>
              <div
                className="overflow-hidden rounded-2xl p-6"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="card-noise" aria-hidden />
                {/* Mock team UI */}
                <div className="relative z-10">
                  <div
                    className="mb-4 flex items-center justify-between"
                  >
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Team Members
                    </p>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{
                        background: "rgba(16, 163, 127, 0.1)",
                        color: "var(--accent)",
                      }}
                    >
                      3 / 5 seats
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      { name: "Sarah Chen", role: "Admin", email: "sarah@company.com", properties: "All properties" },
                      { name: "James Wilson", role: "Member", email: "james@company.com", properties: "2 properties" },
                      { name: "Ana Rivera", role: "Member", email: "ana@company.com", properties: "1 property" },
                    ].map((member) => (
                      <div
                        key={member.name}
                        className="flex items-center gap-3 rounded-xl p-3"
                        style={{
                          background: "var(--bg-tertiary)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(16, 163, 127, 0.1)",
                            color: "var(--accent)",
                          }}
                        >
                          {member.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className="truncate text-sm font-medium"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {member.name}
                            </p>
                            <span
                              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                background:
                                  member.role === "Admin"
                                    ? "rgba(16, 163, 127, 0.1)"
                                    : "var(--bg-secondary)",
                                color:
                                  member.role === "Admin"
                                    ? "var(--accent)"
                                    : "var(--text-muted)",
                                border: "1px solid var(--border-color)",
                              }}
                            >
                              {member.role}
                            </span>
                          </div>
                          <p
                            className="truncate text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {member.properties}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
                description="Type your question in plain English and get instant answers with charts and insights."
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
                answer="Meaning is a GA4 AI chatbot that connects to your Google Analytics 4 properties using read-only access. You ask questions in plain English, and our AI translates them into the right analytics queries, then presents the results in a clear, conversational format with charts and visualizations."
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
                question="What types of visualizations can Meaning generate?"
                answer="Meaning can generate over 12 chart types including bar charts, line charts, pie charts, scatter plots, radar charts, funnels, treemaps, sunbursts, heatmaps, geographic maps, gauge charts, and sankey diagrams. The AI automatically picks the best visualization for your question."
              />
            </FadeInSection>
            <FadeInSection delay={240}>
              <FaqItem
                question="How do email alerts work?"
                answer="You can set up automated email reports that get delivered on a schedule you choose. Pick from weekly snapshots, traffic reports, top pages, or create a custom report with your own prompt. Schedule them weekly, bi-weekly, or monthly and send them to multiple recipients."
              />
            </FadeInSection>
            <FadeInSection delay={320}>
              <FaqItem
                question="Can I invite my team?"
                answer="Yes. You can create a team, invite members via email, and assign them specific GA4 properties. Team members have their own login and can query the properties you grant them access to. Billing is seat-based so you only pay for what you use."
              />
            </FadeInSection>
            <FadeInSection delay={400}>
              <FaqItem
                question="What LLM does Meaning use?"
                answer="Meaning is powered by Anthropic's Claude, one of the most capable and safety-focused large language models available. This powers our natural language analytics interface — delivering accurate, nuanced interpretations of your GA4 data while maintaining the highest standards of data privacy and security."
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
              className="h-6 w-auto invert dark:invert-0"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
            <Link href="/privacy" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Terms
            </Link>
            <Link href="/docs" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Docs
            </Link>
            <Link href="/contact" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Contact
            </Link>
            <span>Copyright &copy; 2026 - All rights reserved | A product by <a href="https://www.hivory.io" target="_blank" rel="noopener noreferrer" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>Hivory</a></span>
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
          "var(--card-bg)",
        border: "1px solid var(--border-color)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(16, 163, 127, 0.4)";
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow =
          "var(--shadow-card-hover)";
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
          "var(--card-bg)",
        border: "1px solid var(--border-color)",
      }}
      onClick={() => setOpen(!open)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(16, 163, 127, 0.4)";
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow =
          "var(--shadow-card-hover)";
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
