import type { Metadata } from "next";
import {
  ComparisonPageLayout,
  type ComparisonPageData,
} from "@/components/marketing/ComparisonPageLayout";

export const metadata: Metadata = {
  title: "Meaning vs Looker Studio: AI marketing analytics alternative",
  description:
    "Looker Studio is free, but you still have to build every dashboard yourself and pay extra for non-Google connectors. Meaning is the AI analyst that builds them for you across GA4, Google Ads, LinkedIn, Mailchimp and more.",
  alternates: { canonical: "/compare/looker-studio" },
  openGraph: {
    title: "Meaning vs Looker Studio",
    description:
      "The AI-native alternative to Looker Studio for marketing teams. Ask questions in plain English across GA4, Google Ads, LinkedIn, and more.",
    url: "/compare/looker-studio",
    type: "website",
  },
};

const data: ComparisonPageData = {
  competitor: {
    name: "Looker Studio",
    tagline: "Google's free dashboarding tool",
  },
  hero: {
    title: "Meaning vs Looker Studio",
    subtitle:
      "Looker Studio is the default choice for GA4 users because it's free. But every dashboard is something you have to build — and every non-Google connector costs extra. Meaning is the AI analyst that answers questions and builds the dashboards for you, across every marketing platform you use.",
    updated: "Updated 2026",
  },
  tldr: {
    competitor: {
      heading: "Looker Studio",
      description:
        "A free drag-and-drop dashboard builder tightly integrated with Google products. Great for static GA4 reports and Google Ads summaries — if you're willing to build and maintain every view yourself.",
      points: [
        "Free, with a Pro tier at $9 per user per month",
        "Deep native integration with GA4, Google Ads, and Sheets",
        "Shareable report links for clients and stakeholders",
        "Manual report building — drag dimensions and metrics",
      ],
    },
    meaning: {
      heading: "Meaning",
      description:
        "An AI analyst for your marketing stack. Ask any question in plain English across GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, and Search Console — and get charts, dashboards, and alerts without building a thing.",
      points: [
        "$9.99 per seat per month, 14-day free trial",
        "Chat across every connector in one conversation",
        "AI-generated dashboards from a single prompt",
        "Scheduled email alerts with AI summaries",
      ],
    },
  },
  featureSections: [
    {
      title: "AI & chat",
      rows: [
        { label: "Ask questions in plain English", competitor: false, meaning: true },
        { label: "AI-written summaries with recommendations", competitor: false, meaning: true },
        { label: "Follow-up questions with full context", competitor: false, meaning: true },
        { label: "Automatic chart selection", competitor: false, meaning: true },
        { label: "Anomaly detection", competitor: false, meaning: true },
      ],
    },
    {
      title: "Dashboards",
      rows: [
        { label: "Manual drag-and-drop report builder", competitor: true, meaning: true },
        { label: "AI-generated widgets from a prompt", competitor: false, meaning: true },
        { label: "Pin chat answers to a dashboard", competitor: false, meaning: true },
        { label: "Currency-aware charts across sources", competitor: false, meaning: true },
        { label: "14 chart types including sankey, sunburst, geo", competitor: true, meaning: true },
      ],
    },
    {
      title: "Connectors",
      rows: [
        {
          label: "Google Analytics 4",
          competitor: true,
          meaning: true,
          note: "Meaning reads from BigQuery export — no sampling, unlimited history.",
        },
        { label: "Google Ads", competitor: true, meaning: true },
        {
          label: "LinkedIn, Mailchimp, Microsoft Ads, Search Console",
          competitor: "Paid add-on",
          meaning: true,
          note: "Looker Studio needs paid third-party connectors (Supermetrics, Porter, etc.). Meaning includes them.",
        },
        { label: "Cross-platform queries in one request", competitor: false, meaning: true },
        { label: "Unified BigQuery data layer", competitor: "partial", meaning: true },
      ],
    },
    {
      title: "Alerts & reports",
      rows: [
        { label: "Scheduled email reports", competitor: false, meaning: true },
        { label: "Prompt-driven alert definitions", competitor: false, meaning: true },
        { label: "Multi-recipient, org-scoped delivery", competitor: false, meaning: true },
        { label: "AI summaries inside emails", competitor: false, meaning: true },
      ],
    },
    {
      title: "Teams & access",
      rows: [
        { label: "Role-based access control", competitor: "Pro tier", meaning: true },
        { label: "Team workspaces", competitor: "Pro tier", meaning: true },
        { label: "Property-level access scoping", competitor: "partial", meaning: true },
        { label: "Seat-based billing, in-app management", competitor: true, meaning: true },
      ],
    },
    {
      title: "Performance & scale",
      rows: [
        {
          label: "Fast with large datasets",
          competitor: "partial",
          meaning: true,
          note: "Looker Studio is known to slow down on high-cardinality data.",
        },
        { label: "Daily auto-sync plus manual resync", competitor: "partial", meaning: true },
        { label: "Historical backfill on new connectors", competitor: false, meaning: true },
      ],
    },
  ],
  pricing: {
    competitor: {
      headline: "Free + $9 / user / mo (Pro)",
      details: [
        "Free tier with no time limits, but no team workspaces or access control",
        "Pro tier adds workspaces and priority support at $9 per user per month",
        "Non-Google connectors sold separately by Supermetrics, Porter, Windsor.ai and others",
        "Extra connector fees typically start around $29–$99 per month each",
      ],
    },
    meaning: {
      headline: "$9.99 / seat / mo",
      details: [
        "All connectors included — GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, Search Console",
        "Unlimited dashboards, alerts, and chat queries",
        "14-day free trial with no credit card required",
        "Seat-based billing with prorated add/remove",
      ],
    },
  },
  whenToChoose: {
    competitor: {
      title: "Choose Looker Studio if…",
      bullets: [
        "Your data lives entirely inside Google (GA4, Ads, Sheets) and you're happy building reports manually.",
        "You need a free tool and you have in-house resources to maintain the dashboards.",
        "You're building client-facing PDF-style reports and prefer a WYSIWYG editor.",
        "You don't need cross-platform queries, email alerts, or AI summaries.",
      ],
    },
    meaning: {
      title: "Choose Meaning if…",
      bullets: [
        "You want answers, not dashboards you have to build yourself.",
        "Your marketing data lives across GA4, Google Ads, LinkedIn, Mailchimp, and more.",
        "You want scheduled AI-written summaries delivered to your team's inbox.",
        "You're tired of connector add-ons quietly breaking your reports.",
      ],
    },
  },
  useCases: [
    {
      title: "Weekly performance recaps",
      description:
        "Replace the manually-assembled Monday morning report with an AI-written summary that runs automatically and hits every stakeholder's inbox.",
    },
    {
      title: "Cross-platform ROAS",
      description:
        "Ask 'compare Google Ads and LinkedIn ROAS last month' and get a single answer — no stitching two Looker Studio reports together.",
    },
    {
      title: "Spend anomaly watch",
      description:
        "Alert the team when any campaign's CPC deviates from its 7-day average by a threshold you set. Not a built-in workflow in Looker Studio.",
    },
    {
      title: "Ad-hoc questions from execs",
      description:
        "Answer 'what drove the bump in signups last week?' in seconds, without touching a dashboard.",
    },
    {
      title: "Multi-currency reporting",
      description:
        "Report revenue in your org currency with exchange rates applied at query time across every source.",
    },
    {
      title: "Self-serve for non-analysts",
      description:
        "Give your whole marketing team a way to ask questions without learning dimensions, metrics, and calculated fields.",
    },
  ],
  migration: {
    title: "Switching from Looker Studio",
    steps: [
      "Sign up for Meaning and start your 14-day free trial.",
      "Connect GA4 via your existing BigQuery export (we guide you through setup if you haven't enabled it).",
      "Connect Google Ads and any other platforms you're currently reporting on.",
      "Ask your first question — or rebuild a Looker Studio dashboard with a single prompt.",
      "Invite your team and set up scheduled email alerts for the reports you used to assemble by hand.",
    ],
  },
  faqs: [
    {
      question: "Is Meaning a replacement for Looker Studio?",
      answer:
        "For most marketing teams, yes. Meaning covers dashboards, reports, and ad-hoc questions — with AI doing the building and analysis. If your use case is purely Google-only, client-facing PDF reports, Looker Studio may still be a fine fit.",
    },
    {
      question: "How does Meaning's GA4 connection compare?",
      answer:
        "Meaning reads from the GA4 BigQuery export, which gives you raw event-level data with unlimited history and no sampling. Looker Studio's GA4 connector uses the Data API, which can sample and has quotas on larger datasets.",
    },
    {
      question: "Do I need to pay extra for non-Google connectors?",
      answer:
        "No. LinkedIn, Mailchimp, Microsoft Ads, Google Search Console — they're all included in Meaning's $9.99/seat. Looker Studio requires paid third-party connectors from providers like Supermetrics or Porter for most non-Google sources.",
    },
    {
      question: "Can Meaning build the dashboards I already have in Looker Studio?",
      answer:
        "In most cases yes — describe the widget you want in plain English and Meaning generates it. You can then drag, resize, and pin it to a dashboard.",
    },
    {
      question: "What about performance on large datasets?",
      answer:
        "Meaning runs queries directly against BigQuery, which is built for scale. Looker Studio is known to slow down on high-cardinality data and very large date ranges.",
    },
    {
      question: "Does Meaning have access control?",
      answer:
        "Yes. Meaning supports admin/member roles and property-level access on every plan. Looker Studio's workspaces and access control require the Pro tier.",
    },
    {
      question: "Can I use both Meaning and Looker Studio?",
      answer:
        "Absolutely. Many teams keep Looker Studio for client-facing PDF-style reports and use Meaning for internal analysis, scheduled alerts, and ad-hoc questions.",
    },
  ],
};

export default function Page() {
  return <ComparisonPageLayout data={data} />;
}
