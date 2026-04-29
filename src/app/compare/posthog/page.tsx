import type { Metadata } from "next";
import {
  ComparisonPageLayout,
  type ComparisonPageData,
} from "@/components/marketing/ComparisonPageLayout";

export const metadata: Metadata = {
  title: "Meaning vs PostHog: marketing analytics vs product analytics",
  description:
    "PostHog is a product analytics platform for engineering and product teams. Meaning is an AI analyst for marketing teams, built on GA4, Google Ads, LinkedIn, and Mailchimp. Here's when to pick each.",
  alternates: { canonical: "/compare/posthog" },
  openGraph: {
    title: "Meaning vs PostHog",
    description:
      "PostHog is product analytics. Meaning is marketing analytics with an AI analyst built in. See how they compare.",
    url: "/compare/posthog",
    type: "website",
  },
};

const data: ComparisonPageData = {
  competitor: {
    name: "PostHog",
    tagline: "Open-source product analytics platform",
  },
  hero: {
    title: "Meaning vs PostHog",
    subtitle:
      "PostHog and Meaning get compared a lot — but they're built for different teams. PostHog is a product analytics suite for engineers and PMs building SaaS products. Meaning is an AI analyst for marketing teams running GA4, Google Ads, LinkedIn, and Mailchimp. Here's exactly where they overlap, and where they don't.",
    updated: "Updated 2026",
  },
  tldr: {
    competitor: {
      heading: "PostHog",
      description:
        "An all-in-one platform for product analytics: event tracking, funnels, session replay, feature flags, A/B testing, error tracking, and surveys. Open source and self-hostable. Built for product and engineering teams.",
      points: [
        "Generous free tier up to 1M events/mo, then usage-based",
        "Session replay, feature flags, experiments, error tracking, surveys",
        "SQL and insights builder for event data",
        "Open source with self-hosting option",
      ],
    },
    meaning: {
      heading: "Meaning",
      description:
        "An AI analyst for the marketing stack. Chat across GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, and Search Console — get dashboards, alerts, and insights without building a thing.",
      points: [
        "Free forever for 2 sources, or $9.99 per seat / month for unlimited",
        "Natural language chat across every marketing source",
        "AI-generated dashboards and email alerts",
        "Built on BigQuery for unlimited history and no sampling",
      ],
    },
  },
  featureSections: [
    {
      title: "Primary use case",
      rows: [
        { label: "Marketing attribution & acquisition reporting", competitor: "partial", meaning: true },
        { label: "Product usage analytics (events, funnels, retention)", competitor: true, meaning: false },
        { label: "Natural language chat across sources", competitor: "partial", meaning: true },
        { label: "AI-written summaries and recommendations", competitor: "partial", meaning: true },
      ],
    },
    {
      title: "Marketing connectors",
      rows: [
        { label: "Google Analytics 4", competitor: false, meaning: true },
        { label: "Google Ads", competitor: false, meaning: true },
        { label: "Microsoft Ads", competitor: false, meaning: true },
        { label: "LinkedIn (organic)", competitor: false, meaning: true },
        { label: "Mailchimp", competitor: false, meaning: true },
        { label: "Google Search Console", competitor: false, meaning: true },
      ],
    },
    {
      title: "Product analytics",
      rows: [
        { label: "Event tracking / autocapture", competitor: true, meaning: false },
        { label: "Session replay", competitor: true, meaning: false },
        { label: "Feature flags", competitor: true, meaning: false },
        { label: "A/B testing and experiments", competitor: true, meaning: false },
        { label: "Error tracking", competitor: true, meaning: false },
        { label: "Surveys", competitor: true, meaning: false },
      ],
    },
    {
      title: "Dashboards & reporting",
      rows: [
        { label: "Drag-and-drop dashboards", competitor: true, meaning: true },
        { label: "AI-generated widgets from a prompt", competitor: "partial", meaning: true },
        { label: "Scheduled email reports", competitor: "partial", meaning: true },
        { label: "Cross-source queries in one request", competitor: false, meaning: true },
        { label: "Currency-aware revenue reporting", competitor: false, meaning: true },
      ],
    },
    {
      title: "Deployment",
      rows: [
        { label: "Hosted cloud", competitor: true, meaning: true },
        { label: "Self-hostable", competitor: true, meaning: false },
        { label: "Open source", competitor: true, meaning: false },
      ],
    },
  ],
  pricing: {
    competitor: {
      headline: "Free up to 1M events / mo",
      details: [
        "Free tier generous for small products",
        "Usage-based pricing after free limits (per event, per recording, per flag request)",
        "Multiple products billed separately — analytics, replay, flags, experiments",
        "Self-hosting available for teams who want full control",
      ],
    },
    meaning: {
      headline: "$9.99 / seat / mo",
      details: [
        "Every connector, dashboard, alert, and chat query included",
        "No per-event or per-recording billing",
        "Free plan available, cancel Pro anytime",
        "Seat-based billing with prorated changes",
      ],
    },
  },
  whenToChoose: {
    competitor: {
      title: "Choose PostHog if…",
      bullets: [
        "You're a product or engineering team on a SaaS product.",
        "You need session replay, feature flags, A/B testing, or error tracking alongside your analytics.",
        "You care about analysing in-app user behaviour: events, funnels, retention, cohorts.",
        "You want an open-source tool you can self-host.",
      ],
    },
    meaning: {
      title: "Choose Meaning if…",
      bullets: [
        "You're a marketing or growth team running paid media, email, and organic channels.",
        "Your data lives in GA4, Google Ads, LinkedIn, Mailchimp, and similar platforms.",
        "You want an AI analyst that answers questions and builds dashboards for you.",
        "You need scheduled email summaries for execs and stakeholders.",
      ],
    },
  },
  useCases: [
    {
      title: "Marketing performance reporting",
      description:
        "Meaning's home turf. Cross-channel ROAS, campaign recaps, weekly exec summaries — all areas where PostHog isn't designed to play.",
    },
    {
      title: "Paid media analysis",
      description:
        "Ask questions across Google Ads, Microsoft Ads, and LinkedIn in one conversation. PostHog doesn't integrate with ad platforms.",
    },
    {
      title: "SEO and content",
      description:
        "Search Console queries, top pages, CTR opportunities — built into Meaning via a native connector.",
    },
    {
      title: "Email performance",
      description:
        "Mailchimp campaign analytics including opens, clicks, and list growth. Not a use case PostHog covers.",
    },
    {
      title: "Scheduled AI summaries",
      description:
        "Prompt-driven email alerts with AI summaries for the numbers that matter. PostHog has alerting but not AI-written narrative reports.",
    },
    {
      title: "Multi-currency revenue",
      description:
        "Report revenue in your org's display currency with exchange rate conversion at query time — important for international marketing teams.",
    },
  ],
  faqs: [
    {
      question: "Is Meaning a PostHog alternative?",
      answer:
        "Only if you're using PostHog for marketing reporting — which it isn't really built for. PostHog shines at product analytics (events, funnels, session replay). Meaning is purpose-built for marketing analytics and has no overlap with PostHog's product-facing features.",
    },
    {
      question: "Can I use Meaning and PostHog together?",
      answer:
        "Yes — and many teams do. PostHog for what happens inside your product, Meaning for what happens across your marketing channels before users land. They complement each other rather than compete.",
    },
    {
      question: "Does Meaning do event tracking?",
      answer:
        "Meaning reads events from your GA4 BigQuery export, which covers marketing-relevant events like page views, conversions, and custom events. For deep in-product behaviour — session replay, feature flags, experiments — PostHog is the better tool.",
    },
    {
      question: "Does PostHog have marketing connectors?",
      answer:
        "PostHog focuses on product analytics from your own app. It doesn't have native connectors for Google Ads, LinkedIn, Mailchimp, or similar marketing platforms.",
    },
    {
      question: "How does the AI chat compare?",
      answer:
        "Meaning is built around chat — every answer comes with AI summaries and next-step recommendations across your marketing stack. PostHog has an AI assistant aimed at product analytics, centred on event data rather than cross-platform marketing sources.",
    },
    {
      question: "Is Meaning open source?",
      answer:
        "No. Meaning is a managed cloud product so we can ship new connectors and features quickly. PostHog is open source and self-hostable, which is a genuine advantage if that's a hard requirement for your team.",
    },
  ],
};

export default function Page() {
  return <ComparisonPageLayout data={data} />;
}
