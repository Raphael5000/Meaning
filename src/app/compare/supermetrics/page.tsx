import type { Metadata } from "next";
import {
  ComparisonPageLayout,
  type ComparisonPageData,
} from "@/components/marketing/ComparisonPageLayout";

export const metadata: Metadata = {
  title: "Meaning vs Supermetrics: AI analytics vs marketing data pipeline",
  description:
    "Supermetrics pipes marketing data into spreadsheets and BI tools — you still build the dashboards. Meaning is the AI analyst that queries, charts, and summarises it all, without another tool in the stack.",
  alternates: { canonical: "/compare/supermetrics" },
  openGraph: {
    title: "Meaning vs Supermetrics",
    description:
      "Supermetrics is ETL. Meaning is the whole analyst. See how they compare for marketing analytics teams.",
    url: "/compare/supermetrics",
    type: "website",
  },
};

const data: ComparisonPageData = {
  competitor: {
    name: "Supermetrics",
    tagline: "Marketing data pipeline to spreadsheets and BI",
  },
  hero: {
    title: "Meaning vs Supermetrics",
    subtitle:
      "Supermetrics is a data pipeline — it pulls marketing data from a huge list of sources and pushes it into Google Sheets, Excel, Looker Studio, or a warehouse. You still need another tool to build the dashboards and another still to get insights. Meaning is the AI analyst that does all three in one conversation.",
    updated: "Updated 2026",
  },
  tldr: {
    competitor: {
      heading: "Supermetrics",
      description:
        "A marketing data ETL tool. Great for agencies and teams who want to centralise 100+ platforms into spreadsheets, Looker Studio, or a data warehouse — and are comfortable building everything downstream themselves.",
      points: [
        "Pricing starts around $37/mo and scales with sources, destinations, users, and accounts",
        "Connector breadth is the headline value — most marketing platforms with an API",
        "No built-in analytics UI — you query the data in Sheets, Looker Studio, or a warehouse",
        "Pays off for teams who already have downstream BI expertise",
      ],
    },
    meaning: {
      heading: "Meaning",
      description:
        "An AI analyst with the pipeline, the dashboards, and the insights in one product. Connect your sources, ask questions in plain English, and get charts, dashboards, and alerts without opening a spreadsheet.",
      points: [
        "Flat $9.99 per seat per month, 14-day free trial",
        "Chat, dashboards, alerts, and AI summaries included",
        "Unified BigQuery data layer across every connector",
        "Cross-platform queries in one request",
      ],
    },
  },
  featureSections: [
    {
      title: "What you get in the box",
      rows: [
        {
          label: "Analytics UI",
          competitor: false,
          meaning: true,
          note: "Supermetrics requires a downstream tool — Sheets, Looker Studio, or a BI platform.",
        },
        { label: "Ask questions in plain English", competitor: false, meaning: true },
        { label: "AI-generated dashboards", competitor: false, meaning: true },
        { label: "Scheduled email alerts with AI summaries", competitor: false, meaning: true },
        { label: "AI insights and recommendations", competitor: false, meaning: true },
      ],
    },
    {
      title: "Connectors & data",
      rows: [
        {
          label: "Marketing platform breadth",
          competitor: "100+ sources",
          meaning: "6 live, more coming",
          note: "Supermetrics has far more connectors; Meaning covers the platforms most marketing teams actually use day-to-day.",
        },
        { label: "Google Analytics 4 via BigQuery export", competitor: "partial", meaning: true },
        { label: "Google Ads", competitor: true, meaning: true },
        { label: "Microsoft Ads", competitor: true, meaning: true },
        { label: "LinkedIn (organic + ads)", competitor: true, meaning: true },
        { label: "Mailchimp", competitor: true, meaning: true },
        { label: "Google Search Console", competitor: true, meaning: true },
        { label: "Unified BigQuery data layer", competitor: "As destination", meaning: true },
      ],
    },
    {
      title: "Workflow",
      rows: [
        { label: "Zero-config onboarding", competitor: "partial", meaning: true },
        { label: "Cross-platform queries in one request", competitor: false, meaning: true },
        { label: "Currency conversion at query time", competitor: "partial", meaning: true },
        { label: "No downstream tool required", competitor: false, meaning: true },
      ],
    },
    {
      title: "Pricing shape",
      rows: [
        { label: "Flat per-seat price", competitor: false, meaning: true },
        { label: "Extra fees for destinations", competitor: true, meaning: false },
        { label: "Extra fees for data sources", competitor: true, meaning: false },
        { label: "Extra fees for users", competitor: true, meaning: false },
      ],
    },
    {
      title: "Reliability",
      rows: [
        {
          label: "Single tool to maintain",
          competitor: false,
          meaning: true,
          note: "Supermetrics + BI + reporting tool = more surface area to break.",
        },
        { label: "Failure surfacing in-app", competitor: true, meaning: true },
        { label: "Manual resync on demand", competitor: true, meaning: true },
      ],
    },
  ],
  pricing: {
    competitor: {
      headline: "From ~$37 / mo, usage-based",
      details: [
        "Starter from around $37/mo, Growth around $199/mo, Pro around $499/mo",
        "Pricing scales with destinations, data sources, users, and connected accounts",
        "Extra data sources typically cost around $29 each",
        "You still need a downstream tool (Sheets, Looker Studio, BI) on top",
      ],
    },
    meaning: {
      headline: "$9.99 / seat / mo",
      details: [
        "Every connector, dashboard, alert, and query included",
        "No extra fees for destinations, sources, or account connections",
        "Unified analytics UI — no other tool required",
        "14-day free trial with no credit card",
      ],
    },
  },
  whenToChoose: {
    competitor: {
      title: "Choose Supermetrics if…",
      bullets: [
        "You need connectors to dozens of niche marketing platforms that Meaning doesn't cover yet.",
        "Your team already has deep BI expertise in Looker Studio, Power BI, or a data warehouse.",
        "You need to pipe marketing data into a custom data warehouse on your own schema.",
        "You're an agency aggregating hundreds of client accounts across many sources.",
      ],
    },
    meaning: {
      title: "Choose Meaning if…",
      bullets: [
        "You want the answer, not the pipeline and the pipeline's dashboard tool.",
        "Your sources are GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, or Search Console.",
        "You want AI-written summaries and scheduled alerts out of the box.",
        "You prefer a flat, predictable seat-based price without source/destination upsells.",
      ],
    },
  },
  useCases: [
    {
      title: "Kill the spreadsheet stack",
      description:
        "Replace the Supermetrics → Sheets → pivot table → screenshot workflow with a single chat question that returns an answer and a chart.",
    },
    {
      title: "Cross-platform ROAS",
      description:
        "Ask for blended ROAS across Google Ads, Microsoft Ads, and LinkedIn in one query — no SQL or spreadsheet formula stitching.",
    },
    {
      title: "Scheduled exec summaries",
      description:
        "Send an AI-written Monday morning recap to stakeholders without building an email template or wiring up another tool.",
    },
    {
      title: "Ad-hoc question answering",
      description:
        "Answer 'why did LinkedIn engagement drop last week?' in 10 seconds — Supermetrics would require you to pull the data and analyse it yourself.",
    },
    {
      title: "Smaller ops teams",
      description:
        "Lean marketing teams get a full analyst stack without needing a BI engineer to keep it running.",
    },
    {
      title: "Predictable pricing",
      description:
        "Flat seat-based billing means you can add a connector or a client without re-pricing your whole contract.",
    },
  ],
  faqs: [
    {
      question: "Is Meaning an alternative to Supermetrics?",
      answer:
        "For most marketing teams, yes — if your sources are among the ones Meaning supports (GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, Search Console). For agencies needing 100+ niche connectors into a custom warehouse, Supermetrics may still be a better fit.",
    },
    {
      question: "Can I use Meaning without a BI tool?",
      answer:
        "Yes — that's the point. Meaning includes chat, dashboards, alerts, and insights in one product. Supermetrics is ETL only and requires you to bring a BI or reporting tool on top.",
    },
    {
      question: "What about connectors Supermetrics has that Meaning doesn't?",
      answer:
        "Supermetrics has significantly more connectors overall. Tell us what's missing — we add new connectors based on customer demand, and Meta Ads is next on the roadmap.",
    },
    {
      question: "How does pricing compare at scale?",
      answer:
        "Meaning's pricing is flat at $9.99 per seat. Supermetrics scales with the number of destinations, data sources, users, and connected accounts — which can make budgeting harder as your setup grows.",
    },
    {
      question: "Can Meaning write to my data warehouse?",
      answer:
        "Meaning maintains its own unified BigQuery data layer that you query through the app. If your use case is piping data into a custom warehouse for downstream modelling, Supermetrics is built for that.",
    },
    {
      question: "Can I use Supermetrics and Meaning together?",
      answer:
        "Yes. Some teams use Supermetrics to pipe niche sources into a warehouse and use Meaning for everyday chat, dashboards, and alerts on their core sources.",
    },
  ],
};

export default function Page() {
  return <ComparisonPageLayout data={data} />;
}
