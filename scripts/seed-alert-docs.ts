/**
 * Seeds 5 Alerts documentation articles into the database.
 *
 * Usage: npx tsx scripts/seed-alert-docs.ts
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Article content                                                    */
/* ------------------------------------------------------------------ */

const articles = [
  /* ================================================================ */
  /*  1. Alerts Overview                                               */
  /* ================================================================ */
  {
    slug: "alerts-overview",
    title: "Alerts Overview",
    description:
      "AI-powered email reports delivered on your schedule across all connected platforms.",
    section: "docs",
    category: "alerts",
    type: "article",
    readTime: "2 min read",
    featured: true,
    keywords: [
      "alerts",
      "overview",
      "email reports",
      "automated",
      "AI",
      "schedule",
    ],
    content: `---
---

Alerts are automated, AI-generated email reports delivered to your inbox on a schedule you control. Instead of logging in to check dashboards, the insights come to you.

When an alert fires, Meaning's AI queries all your connected platforms — GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, and Search Console — analyses the data, and writes a concise report with real metrics, comparisons, and recommendations.

<DocsDemo type="alerts-overview" />

## What You Get

- **Data-driven reports** with real numbers pulled from your connected platforms
- **Period-over-period comparisons** — week-over-week, month-over-month, or custom ranges
- **AI-generated observations** highlighting what changed and why it matters
- **Actionable recommendations** based on your actual performance data

## Alert Types

Meaning offers four alert types, each designed for a different use case:

| Type | Purpose |
|---|---|
| **Weekly Snapshot** | Quick overview of overall marketing performance |
| **Traffic Report** | Detailed breakdown of where your traffic comes from |
| **Top Pages** | Best-performing content ranked by engagement |
| **Custom Report** | Write your own prompt and let AI generate the report |

Each type is covered in detail in the [Alert Types](/docs/alerts/alert-types) article.

## Multi-Platform Support

Alerts pull data from every connected platform automatically. There is no per-platform setup — once a data source is connected, alerts include it.

- **Cross-platform analysis** — a single alert can cover GA4, Google Ads, and LinkedIn data together
- **Currency conversion** — ad spend from different platforms is automatically converted to your organisation's display currency
- **No extra configuration** — connect a new platform and your next alert includes it
`,
  },

  /* ================================================================ */
  /*  2. Creating an Alert                                             */
  /* ================================================================ */
  {
    slug: "creating-alerts",
    title: "Creating an Alert",
    description:
      "Set up your first alert in under a minute — choose a type, add recipients, and pick a schedule.",
    section: "docs",
    category: "alerts",
    type: "guide",
    readTime: "2 min read",
    featured: false,
    keywords: [
      "create",
      "new alert",
      "setup",
      "recipients",
      "schedule",
      "custom report",
    ],
    content: `---
---

## Step-by-Step Setup

1. Click **Alerts** in the sidebar (bell icon).
2. Click **New Alert**.
3. Choose an alert type from the dropdown.
4. Enter recipient email addresses (comma-separated for multiple).
5. Optionally give your alert a name.
6. Set the schedule: select days, time, and interval.
7. Click **Save**.

That is all it takes. Your alert will fire on the next scheduled time.

## Schedule Options

- **Days** — Select one or more days of the week (Monday through Sunday).
- **Time** — Choose the hour (0–23) and minute (00 or 30). Times are in GMT+2.
- **Interval** — Every 1 week, every 2 weeks, or every 4 weeks.

The default schedule is every Monday at 09:00.

## Recipients

- Add multiple email addresses separated by commas.
- Recipients do not need a Meaning account — anyone with an email address can receive reports.
- Great for sending reports to clients, managers, or stakeholders who do not use the platform directly.

## Custom Reports

When you select "Custom Report", a text field appears for your prompt. Write what you want to know in plain English.

**Example prompts:**

- "Compare our Google Ads and Microsoft Ads performance this week, focusing on ROAS and CPC trends"
- "Summarise LinkedIn engagement and Search Console rankings for the last 14 days"
- "Which email campaigns had the best click rate this month?"

The AI will query your data across all connected platforms and generate a tailored report.
`,
  },

  /* ================================================================ */
  /*  3. Alert Types                                                   */
  /* ================================================================ */
  {
    slug: "alert-types",
    title: "Alert Types",
    description:
      "Weekly Snapshot, Traffic Report, Top Pages, and Custom — understand what each alert delivers.",
    section: "docs",
    category: "alerts",
    type: "article",
    readTime: "3 min read",
    featured: false,
    keywords: [
      "alert types",
      "weekly snapshot",
      "traffic report",
      "top pages",
      "custom report",
    ],
    content: `---
---

Meaning offers four alert types. Each one instructs the AI to focus on a different aspect of your data.

<DocsDemo type="alert-types" />

## Weekly Snapshot

The go-to report for a quick overview of your marketing performance.

**Includes:**

- Users, sessions, and pageviews compared to the previous week
- Percentage changes with trend indicators
- Top 5 pages by views
- Traffic source breakdown

**Best for:** Weekly team standups, client updates, keeping a pulse on overall performance.

## Traffic Report

A detailed breakdown of where your traffic comes from.

**Includes:**

- Total users, sessions, and pageviews
- Channel breakdown with percentages (Organic, Paid, Direct, Social, etc.)
- Top 5 traffic sources with metrics
- Day-over-day trends

**Best for:** Understanding acquisition channels, spotting shifts in traffic mix.

## Top Pages

Your best-performing content ranked by engagement.

**Includes:**

- Top 10 pages ranked by page views
- Users, average session duration, and bounce rate per page
- Comparison to previous period

**Best for:** Content teams, identifying high-performing pages, spotting content that needs attention.

## Custom Report

Write your own prompt and let AI generate the report.

**Includes:** Whatever you ask for — the AI has access to all your connected platforms.

**Example prompts:**

- "Compare Google Ads vs Microsoft Ads spend and ROAS this week"
- "Summarise LinkedIn engagement and follower growth for the month"
- "Which email campaigns had the best click rate this quarter?"
- "Show me search queries where we rank on page 2 with high impressions"

**Best for:** Specific analyses, cross-platform reports, stakeholder-specific views.

## Choosing the Right Type

| Need | Alert Type |
|---|---|
| Quick weekly overview | Weekly Snapshot |
| Where traffic comes from | Traffic Report |
| Best content performance | Top Pages |
| Anything specific or cross-platform | Custom Report |
`,
  },

  /* ================================================================ */
  /*  4. Managing Alerts                                               */
  /* ================================================================ */
  {
    slug: "managing-alerts",
    title: "Managing Alerts",
    description:
      "Enable, disable, test, edit, and delete your alerts.",
    section: "docs",
    category: "alerts",
    type: "guide",
    readTime: "2 min read",
    featured: false,
    keywords: [
      "manage",
      "enable",
      "disable",
      "test",
      "edit",
      "delete",
      "alerts",
    ],
    content: `---
---

## Enabling & Disabling

- Toggle the bell icon next to any alert to enable or disable it.
- Disabled alerts keep their configuration but stop sending.
- Re-enable anytime without reconfiguring.

## Testing Alerts

- **Instant Test** (send icon) — Sends a sample email immediately with placeholder data. Use this to verify email addresses and check formatting.
- **Live Test** (play icon) — Generates a real report using your actual data. Takes about a minute to generate and send. Use this to preview exactly what recipients will see.

## Editing Alerts

- Click the pencil icon to modify any alert.
- Change the type, recipients, schedule, or custom prompt.
- Changes take effect on the next scheduled send.

## Deleting Alerts

- Click the trash icon to permanently remove an alert.
- This cannot be undone.

## Multiple Alerts

Create as many alerts as you need. Different alerts can have different types, recipients, and schedules.

**Example setup:**

- **Weekly Snapshot** to the marketing team, every Monday
- **Top Pages** to the content team, every Friday
- **Custom Report** to a client, every 2 weeks
- **Traffic Report** to the CMO, first Monday of the month
`,
  },

  /* ================================================================ */
  /*  5. Schedule & Delivery                                           */
  /* ================================================================ */
  {
    slug: "alert-schedule",
    title: "Schedule & Delivery",
    description:
      "How alert scheduling works, time zones, delivery, and data freshness.",
    section: "docs",
    category: "alerts",
    type: "article",
    readTime: "2 min read",
    featured: false,
    keywords: [
      "schedule",
      "delivery",
      "time zone",
      "cron",
      "email",
      "data freshness",
    ],
    content: `---
---

<DocsDemo type="alert-schedule" />

## How Scheduling Works

Alerts run on a cron job that checks every hour. When the current hour and day match your alert's schedule, the report is generated and sent.

Generation takes 30–60 seconds — the AI queries your data and writes the report in real time.

## Time Zone

Schedule times are displayed in GMT+2. The cron job runs on UTC and your configured time is converted automatically.

## Cadence Options

- **Every week** — Report sent on selected days every week.
- **Every 2 weeks** — Report sent on selected days every other week.
- **Every 4 weeks** — Monthly cadence, sent every 4th week.

You can select multiple days — for example, Monday and Thursday for twice-weekly reports.

## Data Freshness

Reports use the most recent data available at send time.

- **GA4** data is typically 24–48 hours delayed (Google's processing time).
- **Google Ads**, **Microsoft Ads**, and other platforms are near real-time.
- The AI automatically adjusts date ranges based on your alert type and cadence.

## Email Delivery

- Emails are sent via Resend (enterprise-grade transactional email).
- Reports are HTML-formatted with clean tables and formatting.
- Works in all major email clients (Gmail, Outlook, Apple Mail).
- Subject line includes the alert name and organisation name.

## Troubleshooting

- **Not receiving emails?** Check your spam or junk folder. Add noreply@meaning.ing to your contacts.
- **Data looks wrong?** Verify your data sources are connected and syncing in the Connections panel.
- **Alert not firing?** Ensure the alert is enabled (bell icon should be green) and check the schedule matches your expectations.
`,
  },
];

/* ------------------------------------------------------------------ */
/*  Seed                                                               */
/* ------------------------------------------------------------------ */

async function main() {
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
      },
    });
    console.log(`Seeded: ${article.slug}`);
  }
}

main()
  .then(() => {
    console.log("\nAll 5 Alert docs seeded successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
