/**
 * Seeds Getting Started documentation articles into the database.
 *
 * Usage: npx tsx scripts/seed-getting-started-docs.ts
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Article content                                                    */
/* ------------------------------------------------------------------ */

const articles = [
  /* ================================================================ */
  /*  1. Getting Started Overview                                      */
  /* ================================================================ */
  {
    slug: "getting-started-overview",
    title: "Getting Started with Meaning",
    description:
      "Create your account, connect your first data source, and ask your first question — all in under five minutes.",
    section: "docs",
    category: "getting-started",
    type: "guide",
    readTime: "3 min read",
    featured: true,
    keywords: [
      "getting started",
      "overview",
      "setup",
      "onboarding",
      "quick start",
    ],
    content: `---
---

Meaning is the AI analyst for your marketing stack. Connect your platforms, ask questions in plain English, and get answers backed by real data — no SQL, no spreadsheets, no dashboards to configure.

This guide walks you through the four steps to go from sign-up to your first insight.

## What You Get

| Feature | Description |
|---|---|
| **All connectors** | GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, Search Console |
| **Unlimited AI queries** | Ask questions across every connected source |
| **Drag-and-drop dashboards** | 14 chart types, AI-generated widgets |
| **Scheduled email alerts** | AI summaries delivered on any cadence |
| **Unlimited team members** | Invite your whole team at no extra cost |

## Setup in Four Steps

### 1. Create Your Account

Sign up at [meaning.dev/signup](/signup). You get a **14-day free trial** with full access to every feature — no credit card required to start exploring.

After signing up, you'll land on the onboarding screen where you can start your trial.

### 2. Connect Your First Data Source

Head to the **Connections** panel (the plug icon in the sidebar) and choose a platform. Every connection uses OAuth — you authenticate directly with the platform, and Meaning never sees your password.

Once connected, your historical data backfills automatically. You can start querying immediately while the full backfill completes in the background.

See the [Connectors documentation](/docs?section=connectors) for platform-specific setup guides.

### 3. Ask Your First Question

Open the **AI Chat** and type a question in plain English. For example:

- *"What were my top 5 landing pages last month?"*
- *"How much did I spend on Google Ads this week?"*
- *"Show me email open rates by campaign for the last 30 days"*

Meaning queries your actual data across every connected source and returns an answer — with the numbers to back it up.

See the [AI Chat documentation](/docs?section=ai-chat) for tips on getting the most out of your queries.

### 4. Build a Dashboard

Go to **Dashboards** and create a new board. You can:

- **Ask AI to generate widgets** — describe what you want and Meaning builds the chart.
- **Choose from 14 chart types** — bar, line, area, pie, donut, sankey, funnel, scatter, heatmap, treemap, radar, gauge, scorecard, and table.
- **Drag and resize** — arrange your widgets on a flexible grid.

See the [Dashboards documentation](/docs?section=dashboards) for the full guide.

## What's Next

- [Set up email alerts](/docs?section=alerts) to get AI-powered reports delivered on a schedule.
- [Invite your team](/docs?section=teams) so everyone can query and build dashboards.
- Connect additional data sources from the Connections panel.
`,
  },

  /* ================================================================ */
  /*  2. Creating Your Account                                         */
  /* ================================================================ */
  {
    slug: "create-account",
    title: "Creating Your Account",
    description:
      "Sign up, start your free trial, and configure your organisation.",
    section: "docs",
    category: "getting-started",
    type: "guide",
    readTime: "2 min read",
    featured: false,
    keywords: [
      "sign up",
      "create account",
      "free trial",
      "organisation",
      "onboarding",
    ],
    content: `---
---

## Sign Up

1. Go to [meaning.dev/signup](/signup).
2. Create your account with email or Google sign-in.
3. You'll be redirected to the onboarding screen.

## Start Your Free Trial

Meaning includes a **14-day free trial** at **$9.99/month**. Your trial includes:

- All connectors — GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, Search Console
- Unlimited AI queries across every source
- Drag-and-drop dashboards with 14 chart types
- Scheduled email alerts with AI summaries
- Unlimited team members and properties

No charge until your trial ends. Cancel anytime — no questions asked.

## Your Organisation

When you sign up, Meaning automatically creates an **organisation** for you. An organisation is the top-level container for all your data sources, dashboards, alerts, and team members.

You can configure your organisation's settings — including display currency and team permissions — from the **Account** page.

## Next Steps

Once your account is set up, [connect your first data source](/docs/getting-started/connect-data-source).
`,
  },

  /* ================================================================ */
  /*  3. Connecting Your First Data Source                              */
  /* ================================================================ */
  {
    slug: "connect-data-source",
    title: "Connecting Your First Data Source",
    description:
      "Link a marketing platform to Meaning using OAuth and start querying immediately.",
    section: "docs",
    category: "getting-started",
    type: "guide",
    readTime: "3 min read",
    featured: false,
    keywords: [
      "connect",
      "data source",
      "OAuth",
      "integration",
      "first connection",
    ],
    content: `---
---

Meaning connects to your marketing platforms via **OAuth** — a secure authentication flow where you sign in directly with the platform. Meaning never sees or stores your password.

## How to Connect

1. Open the **Connections** panel from the sidebar (the plug icon).
2. Click the platform you want to connect.
3. Sign in with your platform credentials when prompted.
4. Select the specific account or property you want to link.

That's it. Data starts syncing immediately.

## Supported Platforms

| Platform | What syncs |
|---|---|
| **Google Analytics 4** | Website traffic, user behaviour, conversions, e-commerce |
| **Google Ads** | Campaign performance, keywords, cost, conversions |
| **Microsoft Ads** | Bing campaign performance, keywords, spend |
| **LinkedIn** | Company page analytics, post engagement, followers |
| **Mailchimp** | Email campaigns, open rates, click rates, audience |
| **Google Search Console** | Search queries, impressions, clicks, rankings |

## Data Backfill

When you first connect a platform, Meaning backfills your historical data automatically. The exact backfill period depends on the platform and the data available in your account.

You can start querying immediately — the data available so far is queryable while the rest backfills in the background.

## Manual Re-sync

Data syncs automatically every day. If you need fresher data, click the **re-sync** button in the Connections panel to trigger an immediate sync.

## Multiple Properties

You can connect multiple properties from the same platform. For example, if you manage three GA4 properties for different websites, connect all three and query across them from a single chat.

## Next Steps

Now that your data is flowing, [ask your first AI question](/docs/getting-started/first-ai-query).
`,
  },

  /* ================================================================ */
  /*  4. Asking Your First AI Question                                 */
  /* ================================================================ */
  {
    slug: "first-ai-query",
    title: "Asking Your First AI Question",
    description:
      "Open AI Chat, type a question in plain English, and get an answer backed by real data.",
    section: "docs",
    category: "getting-started",
    type: "guide",
    readTime: "3 min read",
    featured: false,
    keywords: [
      "AI chat",
      "first query",
      "ask question",
      "plain English",
      "natural language",
    ],
    content: `---
---

Meaning's AI Chat lets you ask questions about your marketing data in plain English. No SQL, no filters, no report builder — just type what you want to know.

## How It Works

1. Open the **AI Chat** from the sidebar.
2. Type a question in the text box.
3. Press Enter (or click Send).

Meaning translates your question into a query, runs it against your connected data sources, and returns a clear answer — often with a chart or table.

## Example Questions

Here are some questions to try with your first connected data source:

### Google Analytics 4
- *"What were my top 10 landing pages last month?"*
- *"How did my traffic change week over week?"*
- *"What's the bounce rate for organic traffic this month?"*

### Google Ads
- *"How much did I spend on Google Ads last week?"*
- *"Which campaigns had the best conversion rate this month?"*
- *"Show me cost per conversion by campaign for the last 30 days"*

### Microsoft Ads
- *"What's my total spend on Microsoft Ads this quarter?"*
- *"Which ad groups are performing best?"*

### LinkedIn
- *"How many followers did my company page gain this month?"*
- *"What were my top posts by engagement?"*

### Mailchimp
- *"What was the open rate on my last email campaign?"*
- *"Show me email performance for the last 90 days"*

### Search Console
- *"What are my top 20 search queries by clicks?"*
- *"Which pages lost the most impressions last month?"*

## Tips for Better Queries

- **Be specific about time ranges** — "last 7 days", "this month", "March 2026" all work.
- **Name the platform** if you have overlapping data — "Google Ads spend" vs just "spend".
- **Ask follow-ups** — the chat remembers context, so you can refine: *"Now break that down by device"*.
- **Request specific formats** — ask for "a table", "a bar chart", or "a line chart" if you have a preference.

## Next Steps

Ready to save your insights? [Build your first dashboard](/docs/getting-started/first-dashboard).
`,
  },

  /* ================================================================ */
  /*  5. Building Your First Dashboard                                 */
  /* ================================================================ */
  {
    slug: "first-dashboard",
    title: "Building Your First Dashboard",
    description:
      "Create a dashboard, add AI-generated widgets, and arrange them on a drag-and-drop grid.",
    section: "docs",
    category: "getting-started",
    type: "guide",
    readTime: "3 min read",
    featured: false,
    keywords: [
      "dashboard",
      "widgets",
      "chart types",
      "drag and drop",
      "first dashboard",
    ],
    content: `---
---

Dashboards in Meaning let you pin your most important metrics and charts to a persistent, shareable board. Every widget is AI-generated — describe what you want, and Meaning builds it.

## Create a Dashboard

1. Open **Dashboards** from the sidebar.
2. Click **New Dashboard**.
3. Give it a name — e.g. "Weekly Overview" or "Campaign Performance".

## Add Your First Widget

1. Click the **Add Widget** button (or the + icon).
2. Describe the widget you want in plain English — e.g. *"Sessions by channel for the last 30 days as a bar chart"*.
3. Meaning generates the widget with real data from your connected sources.

You can also specify a chart type directly:

| Chart type | Best for |
|---|---|
| **Scorecard** | Single KPI (e.g. total sessions, spend) |
| **Bar** | Comparing categories (channels, campaigns) |
| **Line** | Trends over time |
| **Area** | Volume trends over time |
| **Pie / Donut** | Proportions and share-of-total |
| **Table** | Detailed breakdowns with multiple columns |
| **Sankey** | Flow between dimensions (source → medium → page) |
| **Funnel** | Conversion steps |
| **Scatter** | Correlation between two metrics |
| **Heatmap** | Patterns across two dimensions |
| **Treemap** | Hierarchical proportions |
| **Radar** | Multi-metric comparison |
| **Gauge** | Progress toward a target |

## Arrange and Resize

Widgets sit on a **drag-and-drop grid**. Grab a widget to move it, or drag the bottom-right corner to resize. The layout saves automatically.

## Edit a Widget

Click the widget title to rename it, or click the **edit** icon to modify the underlying query. Meaning regenerates the widget with your updated prompt.

## Next Steps

- [Set up email alerts](/docs/getting-started/setup-alerts) to receive dashboard insights on a schedule.
- Explore the full [Dashboards documentation](/docs?section=dashboards) for advanced features.
`,
  },

  /* ================================================================ */
  /*  6. Setting Up Your First Alert                                   */
  /* ================================================================ */
  {
    slug: "setup-alerts",
    title: "Setting Up Your First Alert",
    description:
      "Schedule an AI-powered email report that delivers insights on any cadence.",
    section: "docs",
    category: "getting-started",
    type: "guide",
    readTime: "2 min read",
    featured: false,
    keywords: [
      "alerts",
      "email reports",
      "schedule",
      "notifications",
      "first alert",
    ],
    content: `---
---

Alerts in Meaning are scheduled, AI-powered email reports. Define a prompt, pick a cadence, and Meaning emails you (and your team) a fresh analysis on schedule.

## Create an Alert

1. Open **Alerts** from the sidebar.
2. Click **New Alert**.
3. Write a prompt describing what you want to know — e.g. *"Summarise this week's Google Ads performance: spend, conversions, cost per conversion, and any notable changes vs. last week."*
4. Choose your **cadence** — daily, weekly, or monthly.
5. Add **recipients** — yourself and any team members who should receive the report.
6. Save the alert.

## What You'll Receive

Each alert email includes:

- An AI-generated summary answering your prompt.
- Key metrics and changes highlighted.
- Delivered straight to your inbox at the scheduled time.

## Example Alert Prompts

- *"Weekly traffic summary: total sessions, top channels, and any pages with >20% traffic drop"*
- *"Daily Google Ads spend check: total cost yesterday, top 3 campaigns by spend, any campaigns over budget"*
- *"Monthly LinkedIn recap: follower growth, top 3 posts by engagement, impressions trend"*
- *"Weekly email performance: open rates and click rates for campaigns sent this week"*

## Managing Alerts

You can edit, pause, or delete alerts at any time from the Alerts page. Paused alerts keep their configuration but stop sending until you resume them.

## Next Steps

- [Invite your team](/docs/getting-started/invite-team) so they can receive alerts and access dashboards.
- Explore the full [Alerts documentation](/docs?section=alerts) for advanced options.
`,
  },

  /* ================================================================ */
  /*  7. Inviting Your Team                                            */
  /* ================================================================ */
  {
    slug: "invite-team",
    title: "Inviting Your Team",
    description:
      "Add team members to your organisation so everyone can query, build, and collaborate.",
    section: "docs",
    category: "getting-started",
    type: "guide",
    readTime: "2 min read",
    featured: false,
    keywords: [
      "invite",
      "team",
      "members",
      "collaboration",
      "organisation",
    ],
    content: `---
---

Meaning includes **unlimited team members** on every plan. Invite your colleagues so they can ask questions, build dashboards, and receive alerts — all using the same connected data sources.

## How to Invite

1. Go to **Account** → **Team** from the sidebar.
2. Click **Invite Member**.
3. Enter their email address.
4. They'll receive an invitation email with a link to join your organisation.

## Roles

| Role | Permissions |
|---|---|
| **Owner** | Full access. Manage billing, connections, team members, and all features. |
| **Member** | Full access to AI chat, dashboards, and alerts. Cannot manage billing or connections. |

## What Team Members Can Do

- Ask AI questions across all connected data sources.
- Create and edit dashboards.
- Set up and receive email alerts.
- View all data within the organisation.

## Managing Your Team

From the Team page, you can:

- Remove team members.
- View who's in your organisation.

## Next Steps

Your setup is complete! Here are some resources to help you get the most out of Meaning:

- [AI Chat tips and techniques](/docs?section=ai-chat)
- [Dashboard builder guide](/docs?section=dashboards)
- [All available connectors](/docs?section=connectors)
`,
  },
];

/* ------------------------------------------------------------------ */
/*  Seed logic                                                         */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("Seeding Getting Started docs…");

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        description: article.description,
        section: article.section,
        category: article.category,
        type: article.type,
        readTime: article.readTime,
        featured: article.featured,
        keywords: article.keywords,
        content: article.content,
      },
      create: {
        slug: article.slug,
        title: article.title,
        description: article.description,
        section: article.section,
        category: article.category,
        type: article.type,
        readTime: article.readTime,
        featured: article.featured,
        keywords: article.keywords,
        content: article.content,
        publishedAt: new Date(),
      },
    });
    console.log(`  ✓ ${article.title}`);
  }

  console.log("\nDone — 7 Getting Started articles seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
