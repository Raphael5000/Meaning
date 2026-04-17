"use client";

import { FeaturePageLayout } from "@/components/marketing/FeaturePageLayout";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { FeatureSplit } from "@/components/marketing/FeatureSplit";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { ConnectorCard } from "@/components/marketing/ConnectorCard";
import { LogoWall } from "@/components/marketing/LogoWall";
import { Reveal } from "@/components/marketing/system/Reveal";
import { connectors as connectorsCopy } from "@/components/marketing/copy";
import { ShieldCheck, RefreshCcw, Layers, Plug, Lock, Zap } from "lucide-react";

const CONNECTOR_DETAIL: {
  name: string;
  summary: string;
  unlocks: string[];
}[] = [
  {
    name: "Google Analytics 4",
    summary: "Read raw GA4 events via your BigQuery export. Unlimited history, no sampling, no API quotas.",
    unlocks: [
      "Sessions, users, pageviews, conversions",
      "Funnels and multi-step journeys",
      "Custom events and e-commerce",
      "Channel, source, medium attribution",
    ],
  },
  {
    name: "Google Ads",
    summary: "Daily sync of campaigns, ad groups, keywords, and conversions across every ad account you connect.",
    unlocks: [
      "Spend, impressions, clicks, CTR, CPC",
      "ROAS and conversion value",
      "Cross-campaign comparisons",
      "Anomaly detection on spend and CPA",
    ],
  },
  {
    name: "Microsoft Ads",
    summary: "Full campaign and ad group performance — SOAP account discovery plus the REST reporting API.",
    unlocks: [
      "Campaign, ad group, and keyword metrics",
      "Spend and conversion reporting",
      "Account-level daily sync",
      "Combine with Google Ads in one query",
    ],
  },
  {
    name: "LinkedIn",
    summary: "Organic company page performance — the Community Management API with posts, engagement, and follower growth.",
    unlocks: [
      "Post impressions, reactions, comments",
      "Follower count and growth over time",
      "Engagement rate by post",
      "Top performing content by period",
    ],
  },
  {
    name: "Mailchimp",
    summary: "Marketing API v3 — campaigns, lists, and open/click performance over time.",
    unlocks: [
      "Campaign opens, clicks, CTR, unsubscribes",
      "List growth and churn",
      "Revenue attribution per campaign",
      "Subject-line and send-time analysis",
    ],
  },
  {
    name: "Search Console",
    summary: "Google Search Console queries, pages, devices, and countries.",
    unlocks: [
      "Queries, impressions, clicks, CTR",
      "Average position over time",
      "Best / worst performing pages",
      "CTR opportunities below target",
    ],
  },
];

export default function ConnectorsPage() {
  return (
    <FeaturePageLayout
      eyebrow="Connectors"
      title="All your marketing data, one conversation."
      subtitle="Meaning connects to the tools your team already runs on — and brings every metric into the same chat, dashboard, and alert."
      heroVisual={
        <div className="liquid-glass relative overflow-hidden rounded-2xl p-10">
          <span className="shimmer" aria-hidden />
          <LogoWall title="Live connectors" />
        </div>
      }
      faqs={[
        {
          question: "What permissions does Meaning need?",
          answer:
            "Read-only wherever possible. For GA4 we read from your BigQuery export, so we never touch your GA4 settings. For ad and email platforms we use OAuth with the minimum read scopes each API allows.",
        },
        {
          question: "Can I connect multiple accounts per platform?",
          answer:
            "Yes. Multiple GA4 properties, ad accounts, LinkedIn pages, and Mailchimp lists can be connected — and queried across — from the same org.",
        },
        {
          question: "How often do connectors sync?",
          answer:
            "Each connector runs a daily automatic sync. You can also trigger an on-demand resync at any time from the integrations panel.",
        },
        {
          question: "What about Meta Ads?",
          answer:
            "Meta Ads is next on the roadmap. Reach out if it's blocking a decision and we'll share timing.",
        },
        {
          question: "How are new connectors prioritised?",
          answer:
            "Purely by customer demand. Tell us which platform is missing and we'll consider it for the roadmap.",
        },
        {
          question: "What happens if a sync fails?",
          answer:
            "Failed syncs are surfaced in the integrations panel with a clear error. You can retry manually or wait for the next scheduled run.",
        },
      ]}
    >
      {/* Connector cards */}
      <MarketingSection center maxWidth="6xl" heading="Live today" subhead="Every connector is queryable from chat, pinnable to dashboards, and usable inside alerts.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connectorsCopy.list.map((c, i) => (
            <Reveal key={c.name} delay={i * 0.04}>
              <ConnectorCard name={c.name} description={c.description} src={c.src} status={c.status} />
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Deep dive per connector */}
      <MarketingSection center maxWidth="6xl" heading="What each connector unlocks">
        <div className="grid gap-6 md:grid-cols-2">
          {CONNECTOR_DETAIL.map((c, i) => (
            <Reveal key={c.name} delay={i * 0.04}>
              <div className="liquid-glass relative h-full overflow-hidden rounded-2xl p-6">
                <span className="shimmer" aria-hidden />
                <div className="relative z-10">
                  <h3 className="mb-2 text-lg font-semibold" style={{ color: "var(--m-text)" }}>
                    {c.name}
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--m-text-secondary)" }}>
                    {c.summary}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {c.unlocks.map((u) => (
                      <li
                        key={u}
                        className="flex items-start gap-2 text-sm"
                        style={{ color: "var(--m-text-secondary)" }}
                      >
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: "var(--brand)" }}
                        />
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Unified data layer split */}
      <MarketingSection>
        <Reveal>
          <FeatureSplit
            eyebrow="Unified data layer"
            heading="Every connector lands in the same place."
            subhead="Meaning normalises data from every source into a unified BigQuery layer — so cross-platform queries work out of the box, and answers stay consistent no matter which source they came from."
            bullets={[
              "Daily syncs into a single BigQuery dataset",
              "Shared currency conversion via exchange rate tables",
              "Consistent metric definitions across platforms",
            ]}
            visual={
              <div className="liquid-glass relative overflow-hidden rounded-2xl p-6">
                <span className="shimmer" aria-hidden />
                <div className="flex flex-col gap-3">
                  {["Google Ads", "Microsoft Ads", "LinkedIn", "Mailchimp", "Search Console", "GA4"].map((s) => (
                    <div key={s} className="flex items-center gap-3">
                      <span
                        className="w-32 shrink-0 rounded-lg px-3 py-2 text-center text-[11px] font-medium"
                        style={{ background: "var(--m-surface-elevated)", color: "var(--m-text-secondary)", border: "1px solid var(--m-hairline)" }}
                      >
                        {s}
                      </span>
                      <div
                        className="h-px flex-1"
                        style={{ background: "linear-gradient(90deg, var(--brand) 0%, transparent 100%)" }}
                      />
                      <span
                        className="rounded-lg px-3 py-2 text-[11px] font-semibold"
                        style={{ background: "var(--brand-soft)", color: "var(--brand)", border: "1px solid var(--brand-ring)" }}
                      >
                        BigQuery
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        </Reveal>
      </MarketingSection>

      {/* Privacy + fresh data cards */}
      <MarketingSection center maxWidth="5xl" heading="Built on trust">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Read-only access"
              description="Meaning can query your data — never change settings, never write back."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="No training on your data"
              description="Your numbers are queried on demand. They are never used to train any model."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<RefreshCcw className="h-6 w-6" />}
              title="Daily syncs + manual resync"
              description="Automatic daily pulls with on-demand resync when you need the freshest numbers."
            />
          </Reveal>
          <Reveal delay={0.18}>
            <FeatureCard
              icon={<Layers className="h-6 w-6" />}
              title="Multi-account"
              description="Connect as many properties and ad accounts as you want under a single org."
            />
          </Reveal>
          <Reveal delay={0.24}>
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Fast onboarding"
              description="OAuth flow for most connectors. Guided BigQuery export setup for GA4."
            />
          </Reveal>
          <Reveal delay={0.3}>
            <FeatureCard
              icon={<Plug className="h-6 w-6" />}
              title="More coming"
              description="Meta Ads next. Tell us what else you need and we'll consider it."
            />
          </Reveal>
        </div>
      </MarketingSection>
    </FeaturePageLayout>
  );
}
