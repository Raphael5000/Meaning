"use client";

import { FeaturePageLayout } from "@/components/marketing/FeaturePageLayout";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { FeatureSplit } from "@/components/marketing/FeatureSplit";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { ChartTypeBadges } from "@/components/marketing/ChartTypeBadges";
import { Reveal } from "@/components/marketing/system/Reveal";
import { BarChart3, Sparkles, PieChart, DollarSign, MousePointer, Pin } from "lucide-react";

const CHART_GUIDE: { name: string; when: string }[] = [
  { name: "Bar", when: "Compare values across a handful of categories." },
  { name: "Line", when: "Show a metric over time — weeks, months, quarters." },
  { name: "Area", when: "Emphasise volume beneath a trend line." },
  { name: "Pie / Donut", when: "Show composition of a whole across up to 6 segments." },
  { name: "Scatter", when: "Expose correlation between two metrics." },
  { name: "Funnel", when: "Step-by-step drop-off in a conversion flow." },
  { name: "Treemap", when: "Nested comparison across many categories at once." },
  { name: "Sunburst", when: "Hierarchical composition across 2+ levels." },
  { name: "Heatmap", when: "Density across two dimensions (hour × day, etc)." },
  { name: "Geographic map", when: "Country- or region-level distribution." },
  { name: "Radar", when: "Compare multiple dimensions across entities." },
  { name: "Gauge", when: "Show progress toward a target KPI." },
  { name: "Sankey", when: "Flows between categories — channels, pages, funnels." },
];

export default function VisualizationsPage() {
  return (
    <FeaturePageLayout
      eyebrow="Visualizations"
      title="Marketing data visualization. 14 chart types, auto-chosen."
      subtitle="You shouldn't have to pick the chart. Meaning reads the question, understands the shape of the answer, and renders the right visualization every time — with the option to override."
      heroVisual={
        <div className="liquid-glass shimmer overflow-hidden rounded-2xl p-10">
          <ChartTypeBadges />
        </div>
      }
      faqs={[
        {
          question: "Can I override the chart type?",
          answer:
            "Yes. Ask for a specific chart type in your follow-up ('show that as a pie chart') and Meaning will regenerate the visualization without re-running the query.",
        },
        {
          question: "Are the charts interactive?",
          answer:
            "Yes — charts in Meaning are powered by ECharts and support tooltips, zoom, and legend toggling.",
        },
        {
          question: "Can I export a chart?",
          answer:
            "You can pin any chart to a dashboard or include it in a scheduled email alert. Image export is on the roadmap.",
        },
        {
          question: "How does Meaning pick the chart?",
          answer:
            "It considers the shape of the data (one metric vs many, time series vs categorical), the dimensions involved, and the intent of the question to pick the most legible visualization.",
        },
        {
          question: "Do charts respect my org currency?",
          answer:
            "Yes. Revenue values render in your org's display currency, converted from source currencies at query time.",
        },
      ]}
    >
      {/* Picker split */}
      <MarketingSection>
        <Reveal>
          <FeatureSplit
            eyebrow="Auto-selected"
            heading="The right chart every time."
            subhead="Meaning considers the shape of the answer — is it over time, across categories, hierarchical, flowing, geographic? — and picks the most legible chart for the job. Override with a single follow-up."
            bullets={[
              "Shape-aware selection logic",
              "Override via natural language follow-up",
              "Always legible on mobile, tablet, and desktop",
            ]}
            visual={
              <div className="liquid-glass overflow-hidden rounded-2xl p-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Sessions over time", chart: "Line" },
                    { label: "Revenue by channel", chart: "Bar" },
                    { label: "Signup funnel", chart: "Funnel" },
                    { label: "Users by country", chart: "Geo map" },
                    { label: "Page referral paths", chart: "Sankey" },
                    { label: "Hour × day heat", chart: "Heatmap" },
                  ].map((c) => (
                    <div
                      key={c.label}
                      className="rounded-xl p-3"
                      style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
                    >
                      <p className="text-xs" style={{ color: "var(--m-text-muted)" }}>{c.label}</p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: "var(--brand)" }}>
                        → {c.chart}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        </Reveal>
      </MarketingSection>

      {/* When to use */}
      <MarketingSection center maxWidth="6xl" heading="When Meaning picks what">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHART_GUIDE.map((g, i) => (
            <Reveal key={g.name} delay={i * 0.04}>
              <div className="liquid-glass h-full rounded-2xl p-5">
                <p className="mb-1 text-sm font-semibold" style={{ color: "var(--m-text)" }}>
                  {g.name}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--m-text-secondary)" }}>
                  {g.when}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Feature grid */}
      <MarketingSection center maxWidth="5xl" heading="Every chart, loaded with details">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Auto-picked"
              description="Meaning picks from 14 chart types based on the shape of your answer — no manual selection required."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<MousePointer className="h-6 w-6" />}
              title="Interactive"
              description="Tooltips, zoom, legend toggling, and hover states powered by ECharts."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<DollarSign className="h-6 w-6" />}
              title="Currency-aware"
              description="Revenue values converted to your org's display currency at query time."
            />
          </Reveal>
          <Reveal delay={0.18}>
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Responsive"
              description="Charts re-render cleanly from mobile to full-screen dashboards."
            />
          </Reveal>
          <Reveal delay={0.24}>
            <FeatureCard
              icon={<PieChart className="h-6 w-6" />}
              title="Manually overridable"
              description="Don't like the chart? Ask for a different one without losing the underlying query."
            />
          </Reveal>
          <Reveal delay={0.3}>
            <FeatureCard
              icon={<Pin className="h-6 w-6" />}
              title="Pinnable"
              description="Send any chart to a dashboard widget or include it in a scheduled email alert."
            />
          </Reveal>
        </div>
      </MarketingSection>
    </FeaturePageLayout>
  );
}
