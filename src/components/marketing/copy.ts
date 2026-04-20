// Single source of truth for landing page copy.
// Edit copy here; LandingPage.tsx composes these into JSX.

export const hero = {
  eyebrow: "Now in beta",
  title: "Never build another dashboard.",
  subtitle:
    "Meaning is the AI analyst for your marketing stack. Ask questions in plain English across GA4, Google Ads, LinkedIn, Mailchimp and more — get charts, dashboards, and alerts in seconds.",
  primaryCta: { label: "Get started", href: "/signup" },
  secondaryCta: { label: "See it in action", href: "#chat" },
};

export const problem = {
  heading: "Dashboards are dead weight.",
  subhead:
    "You didn't hire a marketer to babysit charts. Meaning does the building, digging, and summarising — so you can focus on the decisions.",
  cards: [
    {
      title: "Stop building reports",
      description:
        "No more dragging widgets or rebuilding the same weekly deck. Ask once, get the answer.",
    },
    {
      title: "Stop exporting CSVs",
      description:
        "Data across GA4, Ads, LinkedIn, and email lives in one conversation — no stitching spreadsheets.",
    },
    {
      title: "Stop waiting on analysts",
      description:
        "Self-serve answers in seconds, not tickets in a queue. Everyone on the team can ask.",
    },
  ],
};

export const chat = {
  eyebrow: "Chat",
  heading: "Your analytics, in plain English.",
  subhead:
    "Ask anything across your connected platforms. Meaning figures out which data source to hit, runs the query, and returns an answer with the right chart attached.",
  bullets: [
    "Cross-platform queries in a single message",
    "Auto-selected chart type for every answer",
    "Follow-up questions keep full context",
  ],
  href: "/features/natural-language",
};

export const dashboards = {
  eyebrow: "Dashboards",
  heading: "Dashboards that build themselves.",
  subhead:
    "Describe what you want to see. Meaning generates widgets, arranges them on a drag-and-drop grid, and picks the right visualization from 14 chart types.",
  bullets: [
    "AI-generated widgets from a single prompt",
    "Drag-and-drop grid with resizable tiles",
    "Currency-aware scorecards and charts",
  ],
  href: "/features/dashboards",
};

export const connectors = {
  eyebrow: "Connectors",
  heading: "All your marketing data, one conversation.",
  subhead:
    "Meaning connects to the tools your team already runs on — and brings every metric into the same chat.",
  list: [
    {
      name: "Google Analytics 4",
      description: "Sessions, conversions, funnels, audiences via BigQuery export.",
      src: "/Google Analytics.svg",
      status: "live" as const,
    },
    {
      name: "Google Ads",
      description: "Spend, CPC, CTR, and conversions across campaigns.",
      src: "/Google Ads.svg",
      status: "live" as const,
    },
    {
      name: "Microsoft Ads",
      description: "Full campaign and ad group performance with daily syncs.",
      src: "/Microsoft Ads.svg",
      status: "live" as const,
    },
    {
      name: "LinkedIn",
      description: "Company page impressions, engagement, and follower growth.",
      src: "/Linkedin.svg",
      status: "live" as const,
    },
    {
      name: "Mailchimp",
      description: "Campaign opens, clicks, and list growth over time.",
      src: "/Mailchimp.svg",
      status: "live" as const,
    },
    {
      name: "Search Console",
      description: "Queries, impressions, CTR, and average position.",
      src: "/Search Console.svg",
      status: "live" as const,
    },
    {
      name: "Meta Ads",
      description: "Campaign performance across Facebook and Instagram.",
      src: "/Meta.svg",
      status: "soon" as const,
    },
  ],
  href: "/features/connectors",
};

export const alerts = {
  eyebrow: "Alerts",
  heading: "Insights delivered, not discovered.",
  subhead:
    "Schedule prompt-driven reports that run on their own cadence. Meaning writes the summary, attaches the chart, and sends it to the people who need it.",
  bullets: [
    "Weekly, bi-weekly, or monthly schedules",
    "Multi-recipient, org-scoped delivery",
    "AI-written summaries with recommendations",
    "Preview any alert before it ships",
  ],
  href: "/features/email-alerts",
};

export const insights = {
  eyebrow: "AI Insights",
  heading: "Not just answers. Next steps.",
  subhead:
    "Meaning doesn't stop at the chart. Every answer includes a plain-English summary of what changed, why it matters, and what to try next.",
  bullets: [
    "Change detection and anomaly flags",
    "Recommendations grounded in your data",
    "No fabricated numbers — accuracy is the top priority",
  ],
  href: "/features/ai-insights",
};

export const teams = {
  eyebrow: "Teams",
  heading: "Built for teams.",
  subhead:
    "Invite your team, assign roles, and control which connectors and properties each member can see. Billing scales per seat.",
  bullets: [
    "Admin and member roles",
    "Property-level access control",
    "Seat-based billing, managed in-app",
  ],
  href: "/features/team-collaboration",
};

export const howItWorks = {
  heading: "How it works",
  subhead: "Three steps to your first answer.",
  steps: [
    {
      number: "1",
      title: "Connect",
      description: "Sign in and link GA4, Google Ads, LinkedIn, or any other supported source.",
    },
    {
      number: "2",
      title: "Ask",
      description: "Type your question in plain English. Meaning picks the source and the chart.",
    },
    {
      number: "3",
      title: "Share",
      description: "Pin answers to a dashboard, or schedule them as email alerts for your team.",
    },
  ],
};

export const comparison = {
  heading: "Meaning vs. dashboards.",
  subhead:
    "Traditional BI tools ask you to build the report. Meaning asks you the question.",
  rows: [
    { label: "Works out of the box", left: false, right: true },
    { label: "Cross-platform queries", left: false, right: true },
    { label: "AI-generated summaries", left: false, right: true },
    { label: "No SQL required", left: false, right: true },
    { label: "Drag-and-drop dashboards", left: true, right: true },
    { label: "Scheduled email reports", left: true, right: true },
  ],
};

export const pricing = {
  heading: "Simple pricing.",
  subhead: "$9.99 per seat / month. 14-day free trial. Cancel anytime.",
  cta: { label: "View pricing", href: "/pricing" },
};

export const faqs = [
  {
    question: "Which platforms does Meaning connect to?",
    answer:
      "GA4 (via BigQuery export), Google Ads, Microsoft Ads, LinkedIn Company Pages, Mailchimp, and Google Search Console today. Meta Ads is on the roadmap. You can connect any combination and query across all of them in the same chat.",
  },
  {
    question: "Do I need a BigQuery export set up for GA4?",
    answer:
      "Yes. Meaning reads GA4 data from BigQuery, which gives you raw event-level access and unlimited history. We guide you through the export setup during onboarding if you don't have it yet.",
  },
  {
    question: "Is my analytics data stored or used for training?",
    answer:
      "We query your data on demand and never use it to train any model. Read-only access means we can't change anything in your source accounts either.",
  },
  {
    question: "What LLM powers Meaning?",
    answer:
      "Meaning runs on Anthropic's Claude. It's chosen for accuracy and safety — critical for a product where fabricated numbers are unacceptable.",
  },
  {
    question: "How do email alerts work?",
    answer:
      "Write a prompt, choose a schedule and recipients, and Meaning runs that prompt on its own cadence, then emails the answer with an AI summary and chart. Alerts are scoped to your org and can pull from any connected data source.",
  },
  {
    question: "How does team billing work?",
    answer:
      "Billing is per seat at $9.99/month. Admins can add and remove members at any time, and seats are prorated. Every team starts with a 14-day free trial.",
  },
  {
    question: "Can I self-host Meaning?",
    answer:
      "Not today. Meaning is a managed cloud product so we can ship updates and new connectors quickly. Get in touch if self-hosting is a hard requirement — we want to hear from you.",
  },
  {
    question: "How are dashboards built?",
    answer:
      "Ask Meaning for the widget you want in plain English — 'sessions by channel last 30 days' — and it generates a chart you can drag, resize, and pin to a dashboard. No configuration screens.",
  },
];
