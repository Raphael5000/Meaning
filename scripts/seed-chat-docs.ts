/**
 * Seeds 5 AI Chat documentation articles into the database.
 *
 * Usage: npx tsx scripts/seed-chat-docs.ts
 */

import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/* ------------------------------------------------------------------ */
/*  Article content                                                    */
/* ------------------------------------------------------------------ */

const articles = [
  /* ================================================================ */
  /*  1. Overview                                                      */
  /* ================================================================ */
  {
    slug: "overview",
    title: "AI Chat Overview",
    description:
      "Your AI analytics assistant that queries all your connected data sources in plain English.",
    section: "docs",
    category: "ai-chat",
    type: "article",
    readTime: "3 min read",
    featured: true,
    keywords: ["ai", "chat", "overview", "analytics", "natural language"],
    content: `---
---

The AI chat is the fastest way to get answers from your data. Type a question in plain English and receive numbers, charts, tables, or recommendations drawn from every platform you have connected.

<DocsDemo type="chat-intro" />

## What the chat does

Instead of navigating between analytics dashboards, ad platforms, and spreadsheets, you ask a single question. The AI translates your intent into a structured query, runs it against your data warehouse, and returns a clear, accurate answer.

Every response is grounded in real data. The AI never fabricates numbers — if the data is not available, it will tell you.

## Output types

The chat returns the format that best fits your question:

| Format | When it appears | Example question |
|---|---|---|
| **Scorecard** | Single metric with optional comparison | "How many sessions this month?" |
| **Chart** | Trends, distributions, or comparisons | "Plot daily users for the last 30 days" |
| **Table** | Multi-row breakdowns or ranked lists | "Top 10 landing pages by sessions" |
| **Recommendation** | Actionable insights based on patterns | "Which campaigns should I pause?" |

## How it works

1. You type a question in the chat.
2. The AI determines which data source(s) and metrics are relevant.
3. It constructs and executes a query against BigQuery.
4. Results are formatted into the most appropriate output type.
5. The response is displayed with the exact numbers from your data.

All connected platforms feed into a unified BigQuery data layer, so the AI can answer questions that span multiple sources in a single response.

## Supported platforms

The chat can query any platform you have connected to your organisation.

<DocsDemo type="platforms" />

See [Supported Platforms & Metrics](/docs/ai-chat/supported-platforms) for the full list of metrics available on each platform.
`,
  },

  /* ================================================================ */
  /*  2. Getting Started                                               */
  /* ================================================================ */
  {
    slug: "getting-started",
    title: "Asking Your First Question",
    description:
      "Open the chat, type a question, and get instant analytics insights.",
    section: "docs",
    category: "ai-chat",
    type: "guide",
    readTime: "2 min read",
    featured: false,
    keywords: ["getting started", "first question", "guide", "chat"],
    content: `---
---

Getting your first answer takes about ten seconds. Here is how.

## Open the chat

Click **Chat** in the sidebar, or use the keyboard shortcut displayed next to it. A new conversation opens with an empty input field.

If you have not connected any data sources yet, you will see a prompt to connect one first. The chat needs at least one active platform to query.

## Type your question

Write what you want to know in plain English. There is no special syntax — just ask the way you would ask a colleague.

<DocsDemo type="chat-intro" />

A few things to keep in mind:

- **Be specific about time ranges.** "Sessions this month" is better than "recent sessions."
- **Name the metric.** "Bounce rate on /pricing" is better than "how is pricing doing."
- **Specify the platform** if it could be ambiguous. "LinkedIn followers" rather than "followers."

## Read the response

The AI will return one of four formats depending on your question:

- **Scorecard** — a single number with an optional comparison to the previous period.
- **Chart** — a visual with labeled axes, rendered inline.
- **Table** — a structured breakdown you can scan.
- **Text** — a written explanation with recommendations.

Every number in the response comes directly from your data. If a metric is unavailable, the AI will tell you rather than guess.

## Ask a follow-up

The chat remembers the full conversation, so you can build on previous answers:

1. "How many sessions did we get this month?"
2. "Break that down by traffic source."
3. "Now show me just organic search, daily."

Each follow-up refines the context without repeating yourself.

## Suggested questions

When you start a new conversation, you may see suggested questions tailored to your connected platforms. These are a quick way to explore what the chat can do — click any of them to send it immediately.
`,
  },

  /* ================================================================ */
  /*  3. Supported Platforms & Metrics                                 */
  /* ================================================================ */
  {
    slug: "supported-platforms",
    title: "Supported Platforms & Metrics",
    description:
      "Every platform, metric, and dimension you can query through the AI chat.",
    section: "docs",
    category: "ai-chat",
    type: "article",
    readTime: "5 min read",
    featured: false,
    keywords: [
      "platforms",
      "metrics",
      "ga4",
      "google ads",
      "microsoft ads",
      "linkedin",
      "mailchimp",
      "search console",
    ],
    content: `---
---

The AI chat can query any platform connected to your organisation. Below is a breakdown of the key metrics and dimensions available on each.

<DocsDemo type="platforms" />

## Google Analytics 4

GA4 is the richest data source, covering website and app engagement.

**Metrics:** Sessions, users (total and new), pageviews, bounce rate, average session duration, engagement rate, conversions, revenue.

**Dimensions:** Page path, landing page, exit page, traffic source, medium, channel grouping, campaign, device category, browser, operating system, country, city, date.

**Example questions:**
- "How many sessions did we get this month?"
- "Top 10 landing pages by sessions last 7 days"
- "Bounce rate by device category"
- "Daily users trend for the past 30 days"

## Google Ads

Query campaign performance, keyword data, and spend directly.

**Metrics:** Impressions, clicks, cost, CTR, CPC, conversions, conversion value, ROAS, search impression share.

**Dimensions:** Campaign, ad group, keyword, search query, device, network, date.

**Example questions:**
- "Total Google Ads spend last 7 days"
- "Top 5 campaigns by conversions this month"
- "Which keywords have the highest CPC?"
- "Daily ROAS trend for the past 30 days"

## Microsoft Ads

Same query capabilities as Google Ads, applied to your Microsoft Advertising data.

**Metrics:** Impressions, clicks, cost, CTR, CPC, conversions, conversion rate, revenue.

**Dimensions:** Campaign, keyword, search query, device, date.

**Example questions:**
- "Compare Microsoft Ads vs Google Ads clicks this month"
- "Top search queries by impressions on Microsoft Ads"
- "Daily Microsoft Ads spend for the last 14 days"

## LinkedIn

Query your LinkedIn Company Page analytics, including post engagement and follower data.

**Metrics:** Post impressions, clicks, likes, comments, shares, engagement rate, follower count, page views.

**Dimensions:** Post, date, follower country, follower industry, follower seniority, follower function.

**Example questions:**
- "What is our current LinkedIn follower count?"
- "Top 5 posts by engagement this month"
- "Follower demographics by country"
- "Weekly posting frequency for the past 3 months"

## Mailchimp

Query email campaign performance and audience health.

**Metrics:** Campaigns sent, open rate, click rate, bounce rate, unsubscribes, audience size, audience growth, revenue per campaign.

**Dimensions:** Campaign, audience/list, send date.

**Example questions:**
- "Average open rate for campaigns sent this quarter"
- "Which campaign had the highest click rate?"
- "Plot audience growth over the past 6 months"

## Google Search Console

Query your organic search presence, including indexing and ranking data.

**Metrics:** Impressions, clicks, CTR, average position.

**Dimensions:** Search query, page, country, device, date.

**Example questions:**
- "Top 20 search queries by clicks"
- "Average position for queries containing 'analytics'"
- "Daily organic clicks trend for the past 30 days"
- "Which pages have the most impressions but lowest CTR?"

## Cross-platform queries

Because all platforms share a unified data layer, you can ask questions that span multiple sources in a single query:

- "Which channel drives the most sessions — organic, paid search, or social?"
- "Show me all marketing spend across platforms this month"
- "Compare Google Ads and Microsoft Ads conversions week over week"

The AI will identify the relevant data sources automatically and combine the results.
`,
  },

  /* ================================================================ */
  /*  4. Question Examples                                             */
  /* ================================================================ */
  {
    slug: "question-examples",
    title: "Question Examples",
    description:
      "Ready-to-use questions organised by what you want to know.",
    section: "docs",
    category: "ai-chat",
    type: "guide",
    readTime: "4 min read",
    featured: false,
    keywords: [
      "examples",
      "questions",
      "prompts",
      "templates",
      "how to ask",
    ],
    content: `---
---

Not sure what to ask? Below are ready-to-use questions organised by intent. Copy any of them directly into the chat, or use them as a starting point for your own queries.

<DocsDemo type="question-examples" />

## Totals and scorecards

Get a single number with an optional comparison to the previous period.

- "How many sessions did we get this month?"
- "What is our current follower count on LinkedIn?"
- "Total Google Ads spend last 7 days"
- "How many emails did we send this quarter?"
- "What is our overall bounce rate this month?"
- "Total conversions across all ad platforms this week"

## Trends and charts

Visualise how a metric changes over time.

- "Show me daily sessions for the last 30 days"
- "Plot weekly email open rates for the past 3 months"
- "Daily Google Ads spend trend for the last 14 days"
- "Monthly new users over the past year"
- "Weekly LinkedIn post impressions since January"

## Comparisons

Compare metrics across platforms, time periods, or segments.

- "Compare Google Ads vs Microsoft Ads clicks this month"
- "How does this week compare to last week for pageviews?"
- "Organic vs paid sessions over the last 30 days"
- "This month vs last month: bounce rate, sessions, and conversions"
- "Compare desktop vs mobile conversion rate"

## Breakdowns and rankings

See top performers or split a metric by a dimension.

- "Top 10 landing pages by sessions"
- "Traffic by device category"
- "Follower demographics by country on LinkedIn"
- "Top 5 campaigns by ROAS in Google Ads"
- "Sessions by source/medium, last 7 days"
- "Top search queries by clicks in Search Console"

## Page analysis

Understand how individual pages perform.

- "What are the top exit pages?"
- "Bounce rate for /pricing vs /features"
- "Which pages have the longest average session duration?"
- "Landing page performance: sessions, bounce rate, and conversions"
- "Pages with the most impressions but lowest CTR in Search Console"

## Cross-platform

Query multiple data sources in a single question.

- "Which channel drives the most sessions?"
- "Show me all marketing spend across platforms this month"
- "Total clicks from Google Ads, Microsoft Ads, and organic search"
- "Compare paid and organic traffic trends over the past 30 days"

## Follow-up patterns

The chat remembers context, so you can build on previous answers:

1. "How many sessions this month?" → get the total
2. "Break that down by source" → see the split
3. "Show me just organic, daily" → drill into one segment
4. "How does that compare to last month?" → add a comparison
`,
  },

  /* ================================================================ */
  /*  5. Tips & Best Practices                                         */
  /* ================================================================ */
  {
    slug: "tips",
    title: "Tips & Best Practices",
    description:
      "Get better answers faster with these proven techniques.",
    section: "docs",
    category: "ai-chat",
    type: "article",
    readTime: "3 min read",
    featured: false,
    keywords: ["tips", "best practices", "prompts", "techniques"],
    content: `---
---

The AI chat works best when your question is clear, specific, and scoped. These techniques will help you get accurate answers on the first try.

<DocsDemo type="tips" />

## Be specific about time

The more precise your time range, the more accurate the response.

| Instead of | Try |
|---|---|
| "Recent sessions" | "Sessions this month" |
| "How have we been doing?" | "Daily sessions for the last 14 days" |
| "Lately" | "Last 7 days" or "since March 1" |

If you do not specify a time range, the AI will default to the last 28 days — but it is always better to be explicit.

## Name the metric

Tell the AI exactly what you want to measure. Vague questions produce vague answers.

| Instead of | Try |
|---|---|
| "How is pricing doing?" | "Bounce rate on /pricing last week" |
| "Are ads working?" | "Google Ads ROAS for the last 30 days" |
| "How is email going?" | "Average open rate for Mailchimp campaigns this quarter" |

## Specify the platform

When a metric exists on multiple platforms — like "clicks" or "impressions" — name the platform to avoid ambiguity.

- "Google Ads clicks this month" instead of "clicks this month"
- "LinkedIn follower count" instead of "follower count"
- "Search Console impressions for /blog" instead of "impressions for /blog"

If you intentionally want a cross-platform view, say so explicitly: "Total clicks across Google Ads and Microsoft Ads."

## Use follow-up questions

The chat retains the full conversation context. Instead of writing one complex question, break it into steps:

1. Start broad: "How many sessions this month?"
2. Drill down: "Break that down by traffic source."
3. Focus: "Show me just organic search, daily."
4. Compare: "How does that compare to last month?"

Each follow-up builds on the previous answer without losing context.

## Ask for charts when comparing

Visual formats make trends and comparisons easier to interpret. When you want to spot patterns, explicitly ask for a chart:

- "**Plot** daily sessions for the last 30 days"
- "**Chart** Google Ads vs Microsoft Ads clicks this month"
- "**Show me** a breakdown of traffic by device"

Keywords like "plot," "chart," "show me," and "trend" signal that you want a visual response.

## When to use dashboards instead

The chat is ideal for ad-hoc questions — things you want to know right now. But if you find yourself asking the same question repeatedly, create a dashboard widget instead.

Dashboard widgets refresh automatically, so the numbers are always current without retyping the question. You can create a widget directly from a chat response by clicking **Add to Dashboard**.

Use the chat for exploration. Use dashboards for monitoring.
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
    console.log("\nAll 5 AI Chat docs seeded successfully.");
    return prisma.$disconnect();
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
