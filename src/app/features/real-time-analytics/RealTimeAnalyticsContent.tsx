"use client";

import { FeaturePageLayout } from "@/components/marketing/FeaturePageLayout";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { FeatureSplit } from "@/components/marketing/FeatureSplit";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { Reveal } from "@/components/marketing/system/Reveal";
import { Zap, Database, RefreshCcw, CheckCircle2, Clock, Activity } from "lucide-react";

const SYNC_SCHEDULE = [
  { source: "Google Analytics 4", cadence: "BigQuery daily export", detail: "Event-level data with unlimited history" },
  { source: "Google Ads", cadence: "Daily", detail: "Campaigns, ad groups, keywords, conversions" },
  { source: "Microsoft Ads", cadence: "Daily", detail: "Account, campaign, and ad group reporting" },
  { source: "LinkedIn", cadence: "Daily", detail: "Company page posts, engagement, followers" },
  { source: "Mailchimp", cadence: "Daily", detail: "Campaigns, lists, open/click performance" },
  { source: "Search Console", cadence: "Daily", detail: "Queries, pages, devices, countries" },
];

export default function RealTimeAnalyticsPage() {
  return (
    <FeaturePageLayout
      eyebrow="Fresh data"
      title="Up-to-date data across every connector."
      subtitle="Meaning syncs your GA4 BigQuery export, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, and Search Console daily — so every answer is built on current data, not a stale cache."
      heroVisual={
        <div className="liquid-glass shimmer overflow-hidden rounded-2xl p-6">
          <div className="flex flex-col gap-3">
            {SYNC_SCHEDULE.map((s) => (
              <div
                key={s.source}
                className="flex items-center justify-between gap-4 rounded-xl p-4"
                style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--m-text)" }}>{s.source}</p>
                  <p className="truncate text-xs" style={{ color: "var(--m-text-muted)" }}>{s.detail}</p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                >
                  {s.cadence}
                </span>
              </div>
            ))}
          </div>
        </div>
      }
      faqs={[
        {
          question: "How often does data sync?",
          answer:
            "Connectors sync daily by default. You can also trigger a manual resync for any connector from the integrations panel at any time.",
        },
        {
          question: "Why BigQuery for GA4?",
          answer:
            "BigQuery gives you raw event-level data with unlimited history, which is more powerful and more accurate than the standard GA4 Data API — no sampling, no quotas, no aggregation surprises.",
        },
        {
          question: "Is the data really 'real time'?",
          answer:
            "Daily is our default sync cadence for stability. If you need the freshest numbers between syncs, a manual resync takes seconds.",
        },
        {
          question: "What happens if a sync fails?",
          answer:
            "Failed syncs surface in the integrations panel with a clear error. You can retry manually or wait for the next scheduled run.",
        },
        {
          question: "Can I see the last sync time?",
          answer:
            "Yes. Every connector shows its last successful sync timestamp in the integrations panel.",
        },
      ]}
    >
      {/* Unified layer split */}
      <MarketingSection>
        <Reveal>
          <FeatureSplit
            eyebrow="One data layer"
            heading="Every connector flows into BigQuery."
            subhead="Meaning maintains a unified BigQuery-backed data layer that every connector feeds into. That's why cross-platform queries work out of the box, and why numbers stay consistent no matter how you ask for them."
            bullets={[
              "Single BigQuery dataset per org",
              "Normalised schemas across connectors",
              "Shared exchange-rate tables for currency conversion",
              "Historical backfill when you connect a new source",
            ]}
            visual={
              <div className="liquid-glass overflow-hidden rounded-2xl p-6">
                <div className="relative">
                  <div className="grid grid-cols-3 gap-3">
                    {["GA4", "Google Ads", "MS Ads", "LinkedIn", "Mailchimp", "Search Console"].map((s) => (
                      <div
                        key={s}
                        className="rounded-lg px-3 py-2 text-center text-xs font-medium"
                        style={{
                          background: "var(--m-surface-elevated)",
                          border: "1px solid var(--m-hairline)",
                          color: "var(--m-text-secondary)",
                        }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                  <div className="my-4 flex justify-center">
                    <div
                      className="h-8 w-px"
                      style={{ background: "linear-gradient(180deg, var(--brand) 0%, transparent 100%)" }}
                    />
                  </div>
                  <div
                    className="rounded-xl px-4 py-3 text-center text-sm font-semibold"
                    style={{
                      background: "var(--brand-soft)",
                      border: "1px solid var(--brand-ring)",
                      color: "var(--brand)",
                    }}
                  >
                    BigQuery · unified dataset
                  </div>
                </div>
              </div>
            }
          />
        </Reveal>
      </MarketingSection>

      {/* Freshness guarantees */}
      <MarketingSection center maxWidth="5xl" heading="Freshness guarantees">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<Database className="h-6 w-6" />}
              title="Daily automatic sync"
              description="Every connector pulls the latest data once per day, without any action from you."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<RefreshCcw className="h-6 w-6" />}
              title="On-demand resync"
              description="Need the freshest numbers before your next meeting? Trigger a manual resync from the integrations panel."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<Activity className="h-6 w-6" />}
              title="Last-sync visibility"
              description="Every connector shows its last successful sync time so you always know how fresh the answer is."
            />
          </Reveal>
          <Reveal delay={0.18}>
            <FeatureCard
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Failure surfacing"
              description="If a sync fails, Meaning tells you — with the error and the retry options clearly laid out."
            />
          </Reveal>
          <Reveal delay={0.24}>
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Historical backfill"
              description="Newly connected sources are backfilled so your answers have depth, not just the last 24 hours."
            />
          </Reveal>
          <Reveal delay={0.3}>
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Never sampled"
              description="Raw event-level data from GA4 via BigQuery means no sampling surprises at scale."
            />
          </Reveal>
        </div>
      </MarketingSection>
    </FeaturePageLayout>
  );
}
