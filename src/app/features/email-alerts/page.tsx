"use client";

import { FeaturePageLayout } from "@/components/marketing/FeaturePageLayout";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { FeatureSplit } from "@/components/marketing/FeatureSplit";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { Reveal } from "@/components/marketing/system/Reveal";
import { Bell, Clock, Users, Mail, Sparkles, Eye, Repeat, Send } from "lucide-react";

function EmailPreviewMock() {
  return (
    <div className="liquid-glass relative overflow-hidden rounded-2xl">
      <span className="liquid-glass-shimmer" aria-hidden />
      <div
        className="flex items-center gap-2 px-4 py-3 text-xs"
        style={{ borderBottom: "1px solid var(--m-hairline)", color: "var(--m-text-muted)" }}
      >
        <Mail className="h-3.5 w-3.5" />
        <span>From: Meaning &lt;alerts@meaning.app&gt;</span>
      </div>
      <div className="p-6">
        <p className="mb-1 text-xs" style={{ color: "var(--m-text-muted)" }}>
          Monday · 9:00 AM
        </p>
        <h4 className="mb-4 text-lg font-semibold" style={{ color: "var(--m-text)" }}>
          Weekly performance summary
        </h4>
        <div
          className="mb-4 rounded-xl p-4"
          style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
            AI summary
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--m-text)" }}>
            Sessions were up 12% week over week, driven by paid search. Conversion rate dropped
            0.3pp — worth investigating the new landing page. Google Ads spend tracked to budget.
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
        >
          <p className="mb-2 text-[10px] uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>
            Sessions by channel · last 7 days
          </p>
          <div className="flex h-16 items-end gap-2">
            {[82, 64, 50, 36, 24, 14].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${h}%`,
                  background: "linear-gradient(180deg, var(--brand) 0%, rgba(16, 163, 127, 0.4) 100%)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const USE_CASES = [
  {
    title: "Weekly performance digest",
    desc: "A plain-English summary of traffic, conversions, and ROAS every Monday morning.",
  },
  {
    title: "Spend anomaly watch",
    desc: "Flag any campaign where CPC or spend deviates more than 20% from the weekly average.",
  },
  {
    title: "Content recap",
    desc: "Friday rollup of top pages, top queries, and top posts across GA4, Search Console, and LinkedIn.",
  },
  {
    title: "Exec summary",
    desc: "Monthly one-paragraph summary of the numbers that matter, for stakeholders who don't open dashboards.",
  },
  {
    title: "Campaign wrap-up",
    desc: "End-of-campaign report with full funnel metrics and recommendations for the next one.",
  },
  {
    title: "Funnel health check",
    desc: "Daily alert when any funnel step drop-off crosses a threshold you've set.",
  },
];

export default function EmailAlertsPage() {
  return (
    <FeaturePageLayout
      eyebrow="Alerts"
      title="Insights delivered, not discovered."
      subtitle="Write a prompt. Pick a schedule and recipients. Meaning runs the query on its own cadence and emails the answer with an AI summary, chart, and recommended next steps."
      heroVisual={<EmailPreviewMock />}
      faqs={[
        {
          question: "Which data sources can alerts pull from?",
          answer:
            "Any connector you've linked — GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, or Search Console. A single alert prompt can combine multiple sources in one answer.",
        },
        {
          question: "Who receives the emails?",
          answer:
            "Any combination of org members and external email addresses. Alerts are scoped to the active team/org so only the right people see team data.",
        },
        {
          question: "Can I preview an alert before scheduling?",
          answer:
            "Yes. Run any alert on demand to see exactly what recipients will get before it goes live.",
        },
        {
          question: "Can I pause an alert temporarily?",
          answer:
            "Yes. Alerts can be paused and resumed at any time from the alerts panel.",
        },
        {
          question: "Are the numbers in alerts accurate?",
          answer:
            "Yes. Every alert runs a real query at send time — the numbers are never fabricated, and the AI summary is written against the query result, not hallucinated.",
        },
        {
          question: "How is the AI summary generated?",
          answer:
            "After the query runs, Meaning passes the real result to Claude with strict guardrails — it summarises only what the data shows and never invents values.",
        },
        {
          question: "What timezones are supported?",
          answer:
            "Any. Pick the timezone when you set the schedule, and Meaning will send at the local time you specified.",
        },
      ]}
    >
      {/* Lifecycle */}
      <MarketingSection center maxWidth="5xl" heading="The alert lifecycle">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { icon: <Mail className="h-5 w-5" />, label: "1. Prompt", desc: "Write the question in plain English." },
            { icon: <Clock className="h-5 w-5" />, label: "2. Schedule", desc: "Pick cadence, day, time, timezone." },
            { icon: <Users className="h-5 w-5" />, label: "3. Recipients", desc: "Add any combination of people." },
            { icon: <Send className="h-5 w-5" />, label: "4. Delivery", desc: "Meaning runs it and emails the answer." },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <div className="liquid-glass h-full rounded-2xl p-5 text-center">
                <div
                  className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                >
                  {s.icon}
                </div>
                <p className="mb-1 text-sm font-semibold" style={{ color: "var(--m-text)" }}>{s.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--m-text-muted)" }}>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Anatomy of an alert email */}
      <MarketingSection>
        <Reveal>
          <FeatureSplit
            eyebrow="Anatomy"
            heading="Every alert email, in three parts."
            subhead="The AI summary gives stakeholders the headline. The chart gives analysts the visual. The recommendations give the team the next move."
            bullets={[
              "AI summary — the plain-English headline",
              "Chart — the visual, auto-chosen for the data",
              "Next steps — concrete, grounded recommendations",
              "Raw numbers — the underlying table for rigor",
            ]}
            visual={<EmailPreviewMock />}
          />
        </Reveal>
      </MarketingSection>

      {/* Use cases */}
      <MarketingSection center maxWidth="6xl" heading="What teams use alerts for">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((u, i) => (
            <Reveal key={u.title} delay={i * 0.04}>
              <div className="liquid-glass h-full rounded-2xl p-5">
                <h4 className="mb-2 text-sm font-semibold" style={{ color: "var(--m-text)" }}>
                  {u.title}
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: "var(--m-text-secondary)" }}>
                  {u.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Features grid */}
      <MarketingSection center maxWidth="5xl" heading="Every alert is">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Flexibly scheduled"
              description="Weekly, bi-weekly, or monthly. Pick a day, time, and timezone."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Org-scoped"
              description="Alerts live inside a team. Only the right people see team data."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="AI-summarised"
              description="Every email opens with a plain-English recap and recommended next steps."
            />
          </Reveal>
          <Reveal delay={0.18}>
            <FeatureCard
              icon={<Eye className="h-6 w-6" />}
              title="Previewable"
              description="Run any alert on demand to see the email before it ships to your team."
            />
          </Reveal>
          <Reveal delay={0.24}>
            <FeatureCard
              icon={<Repeat className="h-6 w-6" />}
              title="Reliable"
              description="Built-in retries if a connector sync is slow. Failed runs surface in the alerts panel."
            />
          </Reveal>
          <Reveal delay={0.3}>
            <FeatureCard
              icon={<Bell className="h-6 w-6" />}
              title="Pausable"
              description="Pause and resume alerts anytime without losing the prompt or schedule."
            />
          </Reveal>
        </div>
      </MarketingSection>
    </FeaturePageLayout>
  );
}
