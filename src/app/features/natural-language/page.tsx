"use client";

import { FeaturePageLayout } from "@/components/marketing/FeaturePageLayout";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { FeatureSplit } from "@/components/marketing/FeatureSplit";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { Reveal } from "@/components/marketing/system/Reveal";
import {
  MessageSquare,
  Search,
  Zap,
  Layers,
  GitBranch,
  Languages,
  ShieldCheck,
  Compass,
  Repeat,
} from "lucide-react";

function spotMove(e: React.MouseEvent<HTMLDivElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

const EXAMPLES = [
  {
    category: "Acquisition",
    q: "What were my top 5 traffic sources last month and how did they convert?",
  },
  {
    category: "Paid",
    q: "Compare Google Ads and LinkedIn ROAS week over week for the last 8 weeks.",
  },
  {
    category: "Email",
    q: "Which Mailchimp campaign had the highest click-through rate this quarter?",
  },
  {
    category: "SEO",
    q: "What queries in Search Console have high impressions but CTR below 2%?",
  },
  {
    category: "Funnel",
    q: "Drop-off rate at each step of my signup funnel on mobile vs desktop.",
  },
  {
    category: "Retention",
    q: "Weekly returning user rate for users acquired in January.",
  },
  {
    category: "Revenue",
    q: "Revenue by channel in GBP for Q1, converted from source currency.",
  },
  {
    category: "Cohorts",
    q: "LTV after 30 days for users from paid social vs organic.",
  },
  {
    category: "Anomalies",
    q: "Which campaigns had CPC spike more than 25% this week?",
  },
];

function ChatMockFull() {
  return (
    <div className="liquid-glass relative overflow-hidden rounded-2xl">
      <span className="liquid-glass-shimmer" aria-hidden />
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--m-hairline)" }}
      >
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500 opacity-70" />
          <div className="h-3 w-3 rounded-full bg-yellow-500 opacity-70" />
          <div className="h-3 w-3 rounded-full bg-green-500 opacity-70" />
        </div>
        <span className="ml-2 text-xs" style={{ color: "var(--m-text-muted)" }}>
          Meaning · chat
        </span>
      </div>
      <div className="flex flex-col gap-5 p-6">
        <div className="flex justify-end">
          <div
            className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm"
            style={{ background: "var(--user-bubble)", color: "var(--m-text)" }}
          >
            What were my top paid channels by ROAS last month?
          </div>
        </div>
        <div className="w-full text-sm" style={{ color: "var(--m-text-secondary)", lineHeight: "1.7" }}>
          <p className="mb-2" style={{ color: "var(--m-text)" }}>
            Across Google Ads, Microsoft Ads, and LinkedIn, here's how each paid channel performed in March:
          </p>
          <div
            className="overflow-hidden rounded-lg text-left text-xs"
            style={{ border: "1px solid var(--m-hairline)" }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--m-surface-elevated)" }}>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--m-text)" }}>Channel</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: "var(--m-text)" }}>Spend</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: "var(--m-text)" }}>Revenue</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: "var(--m-text)" }}>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Google Ads", "$12,400", "$52,080", "4.2×"],
                  ["Microsoft Ads", "$3,100", "$10,850", "3.5×"],
                  ["LinkedIn", "$8,200", "$17,220", "2.1×"],
                ].map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--m-hairline)" }}>
                    {r.map((c, j) => (
                      <td
                        key={j}
                        className={`px-3 py-2 ${j === 0 ? "" : "text-right"}`}
                        style={{ color: j === 0 ? "var(--brand)" : "var(--m-text)" }}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs" style={{ color: "var(--m-text-muted)" }}>
            Google Ads delivered the highest return. LinkedIn spend is up 12% vs February but ROAS dropped — worth a creative refresh.
          </p>
        </div>
        <div className="flex justify-end">
          <div
            className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm"
            style={{ background: "var(--user-bubble)", color: "var(--m-text)" }}
          >
            Break LinkedIn down by campaign.
          </div>
        </div>
        <div className="w-full text-sm" style={{ color: "var(--m-text-secondary)" }}>
          <p style={{ color: "var(--m-text)" }}>
            Here are the LinkedIn campaigns for March, ranked by spend…
          </p>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: <Compass className="h-5 w-5" />,
    title: "1. Understands intent",
    desc: "Meaning parses your question and figures out which connector, metric, and time range you mean.",
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "2. Routes to the right source",
    desc: "GA4, Google Ads, LinkedIn, Mailchimp — Meaning picks the data source automatically and queries it directly.",
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "3. Joins across platforms",
    desc: "When a question spans multiple sources, Meaning combines them in the answer — not in a spreadsheet later.",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "4. Renders the answer",
    desc: "A chart, a table, and a plain-English summary arrive together. No dashboard configuration needed.",
  },
];

export default function NaturalLanguagePage() {
  return (
    <FeaturePageLayout
      eyebrow="Chat"
      title="Your analytics, in plain English."
      subtitle="Type a question the way you'd ask a teammate. Meaning picks the right data source, runs the query, and returns an answer with the right chart attached — across every connector you've linked."
      heroVisual={<ChatMockFull />}
      faqs={[
        {
          question: "What languages are supported?",
          answer:
            "Meaning accepts questions in English today. Multilingual support is on the roadmap — get in touch if another language is important to you.",
        },
        {
          question: "Can I ask follow-up questions?",
          answer:
            "Yes. Every chat keeps full context. Refine, compare, drill down, or change the time range without restating the original question.",
        },
        {
          question: "Can a single question span multiple data sources?",
          answer:
            "Yes. Ask 'compare Google Ads spend to Mailchimp revenue' and Meaning will query both sources, join them, and return a single answer.",
        },
        {
          question: "What happens if Meaning can't answer?",
          answer:
            "It tells you. If the required data isn't available — for example a connector isn't linked — Meaning says so explicitly instead of making anything up. Accuracy is the top priority.",
        },
        {
          question: "Does it understand metric definitions?",
          answer:
            "Yes. Meaning knows the difference between sessions and users, CPA and CPC, open rate and CTR, and how each source defines them. Ask for a definition any time.",
        },
        {
          question: "Can I save or share a chat?",
          answer:
            "You can pin any answer to a dashboard, or turn it into a scheduled email alert so the same question runs on a cadence.",
        },
      ]}
    >
      {/* Why it matters */}
      <MarketingSection center maxWidth="5xl" heading="Built for how marketers actually work">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<Search className="h-6 w-6" />}
              title="No query languages"
              description="No SQL, no GA4 dimension/metric memorisation, no report builders. Just ask the question."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Context-aware chat"
              description="Follow-up questions remember filters, time ranges, and previous answers — like talking to a real analyst."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Answer in seconds"
              description="Meaning routes, queries, summarises, and charts in one pass. No waiting on a report to regenerate."
            />
          </Reveal>
        </div>
      </MarketingSection>

      {/* How it works */}
      <MarketingSection center maxWidth="5xl" heading="From question to answer in four steps">
        <div className="grid gap-6 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <div className="liquid-glass relative h-full overflow-hidden rounded-2xl p-6">
                <div className="relative z-10">
                  <div
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                  >
                    {s.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold" style={{ color: "var(--m-text)" }}>
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--m-text-secondary)" }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Example questions grid */}
      <MarketingSection center maxWidth="6xl" heading="What you can ask" subhead="Real questions marketers bring to Meaning every day.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map((e, i) => (
            <Reveal key={e.q} delay={i * 0.03}>
              <div
                className="liquid-glass spotlight relative flex h-full flex-col gap-2 rounded-xl p-4 text-left"
                onMouseMove={spotMove}
              >
                <span
                  className="inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                >
                  {e.category}
                </span>
                <p className="text-sm" style={{ color: "var(--m-text)" }}>
                  &quot;{e.q}&quot;
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Cross-platform split */}
      <MarketingSection>
        <Reveal>
          <FeatureSplit
            eyebrow="Cross-platform"
            heading="One question. Every source."
            subhead="Meaning brings GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, and Search Console into a single conversation. Ask once, get the full picture — no CSVs, no stitching, no context switching."
            bullets={[
              "Join metrics across connectors in a single answer",
              "Switch freshness and date range mid-conversation",
              "Keep full chat history for every question asked",
            ]}
            visual={
              <div className="liquid-glass relative overflow-hidden rounded-2xl p-6">
                <span className="liquid-glass-shimmer" aria-hidden />
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>
                  Sources used
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    { src: "Google Ads", rows: "1,204" },
                    { src: "LinkedIn", rows: "412" },
                    { src: "Mailchimp", rows: "88" },
                    { src: "GA4 (BigQuery)", rows: "18,204" },
                  ].map((r) => (
                    <div
                      key={r.src}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
                    >
                      <span className="text-sm" style={{ color: "var(--m-text)" }}>{r.src}</span>
                      <span className="text-xs" style={{ color: "var(--m-text-muted)" }}>{r.rows} rows scanned</span>
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        </Reveal>
      </MarketingSection>

      {/* Accuracy guardrails */}
      <MarketingSection center maxWidth="5xl" heading="Accuracy over fluency" subhead="Meaning is built to refuse rather than invent. Here's what that means in practice.">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Never fabricates numbers"
              description="Every value in an answer comes from a real query. If a number isn't available, Meaning says so."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<Repeat className="h-6 w-6" />}
              title="Reproducible queries"
              description="Ask the same question twice, get the same answer. The underlying query is deterministic."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<Languages className="h-6 w-6" />}
              title="Definition-aware"
              description="Meaning knows how each source defines sessions, conversions, and revenue — no silent inconsistencies."
            />
          </Reveal>
        </div>
      </MarketingSection>
    </FeaturePageLayout>
  );
}
