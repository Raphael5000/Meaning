import type { Metadata } from "next";
import {
  ComparisonPageLayout,
  type ComparisonPageData,
} from "@/components/marketing/ComparisonPageLayout";

export const metadata: Metadata = {
  title: "Meaning vs Databox: AI Analytics vs KPI Dashboard Builder",
  description:
    "Databox aggregates KPI data into dashboards you build yourself. Meaning is the AI analyst that builds dashboards, answers questions, and sends reports — all from plain English.",
  alternates: { canonical: "/compare/databox" },
  openGraph: {
    title: "Meaning vs Databox",
    description:
      "See how Meaning's AI-powered marketing analytics compares to Databox's KPI dashboard builder.",
    url: "/compare/databox",
    type: "website",
  },
};

const data: ComparisonPageData = {
  competitor: {
    name: "Databox",
    tagline: "KPI dashboard and reporting tool",
  },
  hero: {
    title: "Meaning vs Databox",
    subtitle:
      "Databox connects to your marketing tools and displays KPIs on pre-built or custom dashboards. You still pick the metrics, build the boards, and interpret the numbers. Meaning is the AI analyst that does all of that in one conversation — ask a question in plain English and get the dashboard, the summary, and the next steps.",
    updated: "Updated 2026",
  },
  tldr: {
    competitor: {
      heading: "Databox",
      description:
        "A KPI dashboard tool that pulls data from 100+ integrations into databoards. Strong for goal tracking, scorecards, and TV-mode displays — best for teams who want a traditional dashboard experience.",
      points: [
        "Free tier limited to 3 data sources; paid plans from $47/mo",
        "Pre-built templates and a drag-and-drop databoard builder",
        "Goal tracking and benchmark data across industries",
        "You build and maintain every dashboard manually",
      ],
    },
    meaning: {
      heading: "Meaning",
      description:
        "An AI analyst that connects to your marketing stack, answers questions in plain English, and generates dashboards, charts, and alerts automatically — no manual board-building required.",
      points: [
        "Free forever for 2 sources, or $9.99 per seat / month for unlimited",
        "AI generates widgets from plain-English prompts",
        "Scheduled email alerts with AI summaries and next steps",
        "Cross-platform queries across all connectors in one request",
      ],
    },
  },
  featureSections: [
    {
      title: "Analytics experience",
      rows: [
        {
          label: "Ask questions in plain English",
          competitor: false,
          meaning: true,
          note: "Databox requires you to configure metrics manually.",
        },
        { label: "AI-generated dashboards", competitor: false, meaning: true },
        { label: "AI summaries and recommendations", competitor: false, meaning: true },
        { label: "Scheduled email reports with AI", competitor: "Basic alerts", meaning: true },
        { label: "Pre-built dashboard templates", competitor: true, meaning: false },
        { label: "Goal and benchmark tracking", competitor: true, meaning: false },
      ],
    },
    {
      title: "Connectors & data",
      rows: [
        { label: "Google Analytics 4", competitor: true, meaning: true },
        { label: "Google Ads", competitor: true, meaning: true },
        { label: "Microsoft Ads", competitor: true, meaning: true },
        { label: "LinkedIn", competitor: true, meaning: true },
        { label: "Mailchimp", competitor: true, meaning: true },
        { label: "Google Search Console", competitor: true, meaning: true },
        {
          label: "Total integrations",
          competitor: "100+",
          meaning: "6 live, more coming",
          note: "Databox has broader integration coverage; Meaning focuses on the platforms most teams actually use.",
        },
        { label: "Cross-platform queries in one request", competitor: false, meaning: true },
      ],
    },
    {
      title: "Dashboards",
      rows: [
        { label: "AI-generated widgets from prompts", competitor: false, meaning: true },
        { label: "Drag-and-drop layout", competitor: true, meaning: true },
        { label: "14 chart types, auto-chosen", competitor: false, meaning: true },
        { label: "TV mode / wall display", competitor: true, meaning: false },
        { label: "Currency conversion at query time", competitor: false, meaning: true },
      ],
    },
    {
      title: "Pricing shape",
      rows: [
        { label: "Flat per-seat price", competitor: false, meaning: true },
        { label: "Free tier", competitor: true, meaning: true },
        { label: "Feature gating by plan", competitor: true, meaning: false },
        { label: "Extra fees for data sources", competitor: true, meaning: false },
      ],
    },
  ],
  pricing: {
    competitor: {
      headline: "Free tier; paid from ~$47/mo",
      details: [
        "Free plan limited to 3 data sources and 3 databoards",
        "Starter from $47/mo, Professional from $135/mo, Growth from $319/mo",
        "Higher plans unlock more sources, boards, users, and features",
        "Custom reporting and advanced features on higher tiers only",
      ],
    },
    meaning: {
      headline: "$9.99 / seat / mo",
      details: [
        "Every connector, dashboard, alert, and query included",
        "No feature gating — everything unlocked from day one",
        "Unlimited team members and properties",
        "Free plan available, cancel Pro anytime",
      ],
    },
  },
  whenToChoose: {
    competitor: {
      title: "Choose Databox if…",
      bullets: [
        "You need connections to dozens of niche marketing and SaaS tools that Meaning doesn't cover yet.",
        "You want pre-built dashboard templates and industry benchmarks to compare against.",
        "TV-mode dashboards on office displays are important to your team.",
        "Goal tracking with automated progress alerts is a core part of your workflow.",
      ],
    },
    meaning: {
      title: "Choose Meaning if…",
      bullets: [
        "You want the insight, not the dashboard project — ask a question and get the answer.",
        "Your main sources are GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, or Search Console.",
        "You want AI-written summaries and scheduled email reports out of the box.",
        "You prefer a simple, flat price without per-source or per-feature upsells.",
      ],
    },
  },
  useCases: [
    {
      title: "Replace manual KPI boards",
      description:
        "Instead of dragging metrics onto a databoard one by one, describe the dashboard in a sentence and let Meaning build it.",
    },
    {
      title: "Cross-channel marketing overview",
      description:
        "Ask for blended performance across Google Ads, Microsoft Ads, and LinkedIn in one query — no board configuration needed.",
    },
    {
      title: "AI-powered weekly recap",
      description:
        "Schedule a Monday morning email that summarises the week's performance with an AI-written narrative and chart.",
    },
    {
      title: "Ad-hoc deep dives",
      description:
        "Answer 'which landing pages had the highest bounce rate from paid search this month?' in seconds — Databox would need a dedicated databoard.",
    },
    {
      title: "Lean marketing teams",
      description:
        "Small teams get a full analytics stack without spending hours configuring dashboards.",
    },
    {
      title: "Predictable billing",
      description:
        "Flat per-seat pricing means adding a connector or a team member doesn't change your bill.",
    },
  ],
  faqs: [
    {
      question: "Is Meaning a Databox alternative?",
      answer:
        "For marketing teams whose main data sources are GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, and Search Console — yes. If you need 100+ integrations or industry benchmark data, Databox may be a better fit.",
    },
    {
      question: "Does Meaning have dashboard templates?",
      answer:
        "Not in the traditional sense. Instead of picking a template and customizing it, you describe what you want in plain English and Meaning generates the widgets. Many teams find this faster than browsing a template library.",
    },
    {
      question: "Can Meaning track goals?",
      answer:
        "You can set up alerts that flag when a metric crosses a threshold, but Meaning doesn't have Databox-style goal tracking with progress bars and benchmarks. This is on the roadmap.",
    },
    {
      question: "How does pricing compare?",
      answer:
        "Meaning is $9.99 per seat per month with everything included. Databox starts free but limits data sources and features — paid plans start around $47/mo and scale with usage.",
    },
    {
      question: "Can I use Databox and Meaning together?",
      answer:
        "Yes. Some teams use Databox for TV displays and benchmark tracking while using Meaning for ad-hoc questions, AI reports, and cross-channel queries.",
    },
    {
      question: "Does Meaning support TV-mode dashboards?",
      answer:
        "Not currently. Meaning's dashboards are designed for interactive use on laptops and desktops. If wall displays are critical, Databox handles that well.",
    },
  ],
};

export default function Page() {
  return <ComparisonPageLayout data={data} />;
}
