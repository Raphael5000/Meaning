"use client";

import { FeaturePageLayout } from "@/components/marketing/FeaturePageLayout";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { FeatureSplit } from "@/components/marketing/FeatureSplit";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { ChartTypeBadges } from "@/components/marketing/ChartTypeBadges";
import { Reveal } from "@/components/marketing/system/Reveal";
import {
  LayoutGrid,
  Sparkles,
  Move,
  Pin,
  DollarSign,
  Users,
  Table,
  Gauge,
} from "lucide-react";

function DashboardMockLarge() {
  return (
    <div className="liquid-glass relative overflow-hidden rounded-2xl p-5">
      <span className="liquid-glass-shimmer" aria-hidden />
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--m-text)" }}>
              Growth overview
            </p>
            <p className="text-[11px]" style={{ color: "var(--m-text-muted)" }}>
              Last 30 days · All connectors
            </p>
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{ background: "rgba(16, 163, 127, 0.1)", color: "var(--brand)" }}
          >
            Live
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Sessions", value: "24,891", delta: "+12%" },
            { label: "Revenue", value: "$48,204", delta: "+8%" },
            { label: "ROAS", value: "3.7×", delta: "+0.4" },
            { label: "Signups", value: "1,204", delta: "+21%" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-3"
              style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
            >
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>{s.label}</p>
              <p className="mt-1 text-base font-semibold" style={{ color: "var(--m-text)" }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: "var(--brand)" }}>{s.delta}</p>
            </div>
          ))}
          <div
            className="col-span-2 rounded-xl p-3"
            style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
          >
            <p className="mb-2 text-[10px] uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>
              Sessions by channel
            </p>
            <div className="flex h-20 items-end gap-2">
              {[80, 62, 45, 32, 22, 14].map((h, i) => (
                <div
                  key={i}
                  className="glass-bar flex-1 rounded-t"
                  style={{
                    height: `${h}%`,
                  }}
                />
              ))}
            </div>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
          >
            <p className="mb-2 text-[10px] uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>Conv rate</p>
            <div
              className="mx-auto mt-1 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "rgba(16, 163, 127, 0.1)", border: "2px solid var(--brand)" }}
            >
              <span className="text-xs font-semibold" style={{ color: "var(--brand)" }}>3.8%</span>
            </div>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
          >
            <p className="mb-2 text-[10px] uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>Top country</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--m-text)" }}>🇺🇸 US</p>
            <p className="text-[10px]" style={{ color: "var(--m-text-muted)" }}>38.4%</p>
          </div>
          <div
            className="col-span-4 rounded-xl p-3"
            style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
          >
            <p className="mb-2 text-[10px] uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>
              Revenue over time
            </p>
            <svg viewBox="0 0 400 60" className="h-16 w-full">
              <polyline
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2"
                points="0,50 40,42 80,38 120,30 160,35 200,22 240,28 280,16 320,20 360,10 400,14"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

const WIDGET_TYPES = [
  { icon: <Gauge className="h-5 w-5" />, name: "Scorecards", desc: "Single-metric KPIs with delta vs previous period." },
  { icon: <LayoutGrid className="h-5 w-5" />, name: "Charts", desc: "14 chart types, auto-picked or manually overridden." },
  { icon: <Table className="h-5 w-5" />, name: "Tables", desc: "Sortable rows with formatted currency and percentages." },
  { icon: <Users className="h-5 w-5" />, name: "Breakdowns", desc: "Segment any metric by dimension in one click." },
];

export default function DashboardsPage() {
  return (
    <FeaturePageLayout
      eyebrow="Dashboards"
      title="Marketing dashboards that build themselves."
      subtitle="Describe the widget you want. Meaning generates it, picks the right chart from 14 types, and drops it onto a drag-and-drop grid you can resize and rearrange."
      heroVisual={<DashboardMockLarge />}
      faqs={[
        {
          question: "How are widgets created?",
          answer:
            "Ask for what you want in plain English — 'sessions by channel last 30 days' — and Meaning generates a widget with the right chart type. You can then drag, resize, or pin it to any dashboard.",
        },
        {
          question: "Can I have multiple dashboards?",
          answer:
            "Yes. Create as many as you need — a weekly overview, a paid-media deep dive, an executive summary — and switch between them in one click.",
        },
        {
          question: "Are dashboards shared across the team?",
          answer:
            "Dashboards live at the org level, visible to every member with access to the underlying data.",
        },
        {
          question: "Do dashboards respect the org currency?",
          answer:
            "Yes. Revenue values are converted to your org's display currency at query time using up-to-date exchange rates.",
        },
        {
          question: "Can I change a widget's chart type?",
          answer:
            "Yes. Every widget lets you override the auto-picked chart type without rewriting the prompt.",
        },
        {
          question: "How often does dashboard data refresh?",
          answer:
            "Every dashboard reflects the latest sync from each connector — typically daily, plus on-demand manual refresh.",
        },
      ]}
    >
      {/* Widget types */}
      <MarketingSection center maxWidth="5xl" heading="What goes on a dashboard">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {WIDGET_TYPES.map((w, i) => (
            <Reveal key={w.name} delay={i * 0.04}>
              <FeatureCard
                icon={w.icon}
                title={w.name}
                description={w.desc}
              />
            </Reveal>
          ))}
        </div>
        <div className="mt-10">
          <p className="mb-4 text-center text-sm" style={{ color: "var(--m-text-muted)" }}>
            And every chart type under the sun
          </p>
          <div className="flex justify-center">
            <ChartTypeBadges />
          </div>
        </div>
      </MarketingSection>

      {/* AI generation split */}
      <MarketingSection>
        <Reveal>
          <FeatureSplit
            eyebrow="AI-generated"
            heading="From prompt to widget in one message."
            subhead="No configuration screens. No metric pickers. No query builder. Describe the widget you want in a sentence and Meaning builds it — then drops it onto the grid where you can keep refining."
            bullets={[
              "Auto-selects the right chart type",
              "Infers time range, filters, and breakdowns",
              "Override anything with a follow-up message",
            ]}
            visual={
              <div className="liquid-glass relative overflow-hidden rounded-2xl p-6">
                <span className="liquid-glass-shimmer" aria-hidden />
                <div className="relative z-10">
                  <div
                    className="mb-4 rounded-xl p-4 text-sm"
                    style={{
                      background: "var(--m-surface-elevated)",
                      border: "1px solid var(--m-hairline)",
                      color: "var(--m-text)",
                    }}
                  >
                    &quot;Revenue by channel over the last 90 days, in GBP&quot;
                  </div>
                  <div
                    className="flex items-center gap-2 text-[11px] font-medium"
                    style={{ color: "var(--brand)" }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generating widget…
                  </div>
                  <div
                    className="mt-4 rounded-xl p-4"
                    style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
                  >
                    <p className="mb-2 text-[10px] uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>
                      Revenue by channel · GBP
                    </p>
                    <div className="flex h-16 items-end gap-2">
                      {[72, 58, 44, 30, 18].map((h, i) => (
                        <div
                          key={i}
                          className="glass-bar flex-1 rounded-t"
                          style={{
                            height: `${h}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            }
          />
        </Reveal>
      </MarketingSection>

      {/* Drag and drop split */}
      <MarketingSection>
        <Reveal>
          <FeatureSplit
            reverse
            eyebrow="Drag & drop"
            heading="A grid built for rapid iteration."
            subhead="Rearrange, resize, duplicate, and delete widgets without ever leaving the canvas. Every change is persisted for your whole team."
            bullets={[
              "Resize any widget from tiny scorecard to full-width chart",
              "Pin widgets from chat directly onto the grid",
              "Duplicate dashboards as templates",
            ]}
            visual={
              <div className="liquid-glass relative overflow-hidden rounded-2xl p-5">
                <span className="liquid-glass-shimmer" aria-hidden />
                <div className="relative z-10">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { c: 2, r: 1 },
                      { c: 1, r: 1 },
                      { c: 1, r: 1 },
                      { c: 2, r: 2 },
                      { c: 1, r: 1 },
                      { c: 1, r: 1 },
                      { c: 2, r: 1 },
                    ].map((cell, i) => (
                      <div
                        key={i}
                        className="rounded-lg border-2 border-dashed"
                        style={{
                          borderColor: "var(--m-hairline)",
                          background: i % 2 === 0 ? "rgba(16, 163, 127, 0.06)" : "var(--m-surface-elevated)",
                          gridColumn: `span ${cell.c}`,
                          gridRow: `span ${cell.r}`,
                          height: `${cell.r * 40}px`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            }
          />
        </Reveal>
      </MarketingSection>

      {/* Why it's different */}
      <MarketingSection center maxWidth="5xl" heading="Everything a traditional dashboard can't do">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Zero configuration"
              description="No metric library, no dimension picker, no query builder. Ask and you have a widget."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<DollarSign className="h-6 w-6" />}
              title="Currency-aware"
              description="Every revenue metric respects your org's display currency, converted live at query time."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<Pin className="h-6 w-6" />}
              title="Pin from chat"
              description="Turn any chat answer into a permanent widget with one click — no rebuilding."
            />
          </Reveal>
          <Reveal delay={0.18}>
            <FeatureCard
              icon={<Move className="h-6 w-6" />}
              title="Instant rearrangement"
              description="Drag widgets to reflow the whole dashboard. Layout persists for everyone in the org."
            />
          </Reveal>
          <Reveal delay={0.24}>
            <FeatureCard
              icon={<LayoutGrid className="h-6 w-6" />}
              title="14 chart types"
              description="From bar and line to sankey, sunburst, and geo heatmaps. Auto-picked or manually overridden."
            />
          </Reveal>
          <Reveal delay={0.3}>
            <FeatureCard
              icon={<Table className="h-6 w-6" />}
              title="Mix it up"
              description="Combine scorecards, tables, and charts in a single view. No need to flip between pages."
            />
          </Reveal>
        </div>
      </MarketingSection>
    </FeaturePageLayout>
  );
}
