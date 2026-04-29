import type { Metadata } from "next";
import {
  ComparisonPageLayout,
  type ComparisonPageData,
} from "@/components/marketing/ComparisonPageLayout";

export const metadata: Metadata = {
  title: "Meaning vs Whatagraph: AI Analyst vs Client Reporting Tool",
  description:
    "Whatagraph builds beautiful client reports from marketing data. Meaning is the AI analyst that answers questions, builds dashboards, and sends reports — all from a single conversation.",
  alternates: { canonical: "/compare/whatagraph" },
  openGraph: {
    title: "Meaning vs Whatagraph",
    description:
      "See how Meaning's AI-powered marketing analytics compares to Whatagraph's client reporting platform.",
    url: "/compare/whatagraph",
    type: "website",
  },
};

const data: ComparisonPageData = {
  competitor: {
    name: "Whatagraph",
    tagline: "Cross-channel marketing reporting platform",
  },
  hero: {
    title: "Meaning vs Whatagraph",
    subtitle:
      "Whatagraph is a cross-channel reporting platform built for agencies — it connects to marketing data sources and produces polished client-facing reports. You still pick the metrics, design the layout, and schedule delivery. Meaning is the AI analyst that builds reports from a plain-English prompt and includes an AI summary with every send.",
    updated: "Updated 2026",
  },
  tldr: {
    competitor: {
      heading: "Whatagraph",
      description:
        "A reporting platform designed for agencies managing multiple clients. Connects to 45+ marketing sources and outputs branded, drag-and-drop reports with scheduled delivery.",
      points: [
        "Plans from around $199/mo; pricing scales with users and data sources",
        "Branded, white-label reports for client delivery",
        "45+ marketing integrations with cross-channel blending",
        "You build every report template manually",
      ],
    },
    meaning: {
      heading: "Meaning",
      description:
        "An AI analyst that connects to your marketing stack, answers questions in plain English, and generates dashboards, charts, and scheduled email reports — no manual template building required.",
      points: [
        "Free forever for 2 sources, or $9.99 per seat / month for unlimited",
        "AI generates reports from plain-English prompts",
        "Every scheduled email includes AI summary and next steps",
        "Cross-platform queries across all connectors in one request",
      ],
    },
  },
  featureSections: [
    {
      title: "Reporting",
      rows: [
        { label: "AI-generated reports from prompts", competitor: false, meaning: true },
        { label: "AI summaries and recommendations", competitor: false, meaning: true },
        {
          label: "White-label branding",
          competitor: true,
          meaning: false,
          note: "Whatagraph reports can be branded with client logos and colors.",
        },
        { label: "Drag-and-drop report builder", competitor: true, meaning: "AI-generated" },
        { label: "Scheduled email delivery", competitor: true, meaning: true },
        { label: "PDF export", competitor: true, meaning: false },
      ],
    },
    {
      title: "Analytics",
      rows: [
        { label: "Ask questions in plain English", competitor: false, meaning: true },
        { label: "Interactive dashboards", competitor: true, meaning: true },
        { label: "Cross-platform queries in one request", competitor: "partial", meaning: true },
        { label: "14 chart types, auto-chosen", competitor: false, meaning: true },
        { label: "Currency conversion at query time", competitor: false, meaning: true },
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
          competitor: "45+",
          meaning: "6 live, more coming",
          note: "Whatagraph covers more sources; Meaning covers the ones most marketing teams use daily.",
        },
      ],
    },
    {
      title: "Pricing shape",
      rows: [
        { label: "Flat per-seat price", competitor: false, meaning: true },
        { label: "Per-source or per-client pricing", competitor: true, meaning: false },
        { label: "Annual contract required", competitor: "Often", meaning: false },
      ],
    },
  ],
  pricing: {
    competitor: {
      headline: "From ~$199/mo",
      details: [
        "Entry-level plans start around $199/mo billed annually",
        "Pricing scales with number of data sources, users, and clients",
        "White-label and custom branding on higher tiers",
        "Annual contracts are common for discounted rates",
      ],
    },
    meaning: {
      headline: "$9.99 / seat / mo",
      details: [
        "Every connector, dashboard, alert, and query included",
        "No per-client or per-source fees",
        "Month-to-month, cancel anytime",
        "Free plan available, no credit card to start",
      ],
    },
  },
  whenToChoose: {
    competitor: {
      title: "Choose Whatagraph if…",
      bullets: [
        "You're an agency that needs white-label, client-branded PDF reports.",
        "You need 45+ marketing integrations including social platforms Meaning doesn't cover yet.",
        "Polished report templates and drag-and-drop design are core to your workflow.",
        "You need to aggregate many clients into one reporting workspace.",
      ],
    },
    meaning: {
      title: "Choose Meaning if…",
      bullets: [
        "You want AI-generated reports and insights, not another template builder.",
        "Your main sources are GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, or Search Console.",
        "You value ad-hoc question answering alongside scheduled reports.",
        "You want flat, predictable pricing without per-client or per-source fees.",
      ],
    },
  },
  useCases: [
    {
      title: "Replace report-building time",
      description:
        "Instead of spending an hour designing a report template, write a prompt and let Meaning build it — then schedule it to send automatically.",
    },
    {
      title: "Ad-hoc client questions",
      description:
        "When a client asks 'why did CPC spike last week?', answer in seconds from chat instead of building a new report section.",
    },
    {
      title: "Cross-channel performance",
      description:
        "Get blended metrics across Google Ads, Microsoft Ads, and LinkedIn in one query — no multi-source report configuration.",
    },
    {
      title: "AI-narrated weekly updates",
      description:
        "Schedule a Monday email with an AI-written summary, chart, and next steps — every recipient gets context, not just numbers.",
    },
    {
      title: "Small team, big output",
      description:
        "Lean teams get enterprise-grade analytics output without dedicating someone to report building.",
    },
    {
      title: "Budget-friendly analytics",
      description:
        "At $9.99/seat, Meaning costs a fraction of Whatagraph's entry price — with AI insights included.",
    },
  ],
  faqs: [
    {
      question: "Is Meaning a Whatagraph alternative?",
      answer:
        "For teams who want AI-powered analytics and automated reports, yes. If you specifically need white-label PDF reports with agency branding, Whatagraph is purpose-built for that.",
    },
    {
      question: "Can Meaning produce white-label reports?",
      answer:
        "Not currently. Meaning's email reports are delivered as Meaning-branded emails with AI summaries and charts. White-label branding is on the roadmap.",
    },
    {
      question: "Does Meaning support PDF export?",
      answer:
        "Not yet. Dashboard and report PDF export is planned. For now, reports are delivered as scheduled emails.",
    },
    {
      question: "How does pricing compare?",
      answer:
        "Meaning is $9.99 per seat per month with everything included. Whatagraph starts around $199/mo and scales with sources, users, and clients.",
    },
    {
      question: "Can I use both Whatagraph and Meaning?",
      answer:
        "Yes. Some agencies use Whatagraph for polished client-facing PDFs and Meaning for internal analytics, ad-hoc questions, and AI-powered email reports.",
    },
    {
      question: "What integrations does Whatagraph have that Meaning doesn't?",
      answer:
        "Whatagraph covers 45+ sources including Facebook Ads, Instagram, TikTok, and others. Meaning currently supports GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, and Search Console — with more coming.",
    },
  ],
};

export default function Page() {
  return <ComparisonPageLayout data={data} />;
}
