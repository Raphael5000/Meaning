/**
 * Seeds the Chart Types documentation article into the database.
 *
 * Usage: npx tsx scripts/seed-chart-types-doc.ts
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

const article = {
  slug: "chart-types",
  title: "Chart Types",
  description:
    "Bar, line, pie, and sankey — when to use each chart type and how to prompt for them.",
  section: "docs",
  category: "dashboards",
  type: "guide",
  readTime: "4 min read",
  featured: false,
  keywords: ["charts", "bar", "line", "pie", "sankey", "visualization"],
  content: `---
---

Meaning supports four chart types, each suited for different kinds of analysis. The AI automatically picks the best chart type based on your prompt, but you can also request a specific type.

<DocsDemo type="chart-types" />

## Bar Chart

Bar charts are the most versatile chart type. They display data as vertical bars, making it easy to compare values across categories.

**Best for:**
- Comparing categories side by side (top pages, campaigns, ad groups)
- Showing rankings (top 10 keywords by clicks)
- Period comparisons (sessions by day of week)

**Example prompts:**
- "Top 10 landing pages by sessions"
- "Google Ads campaign spend comparison"
- "Sessions by device category"
- "LinkedIn impressions by month for the last 12 months"

**Features:**
- Multiple series supported (e.g. clicks vs impressions side by side)
- Rounded bar tops for a polished look
- X-axis labels auto-rotate when there are many categories
- Hover tooltip shows exact values

## Line Chart

Line charts show data points connected by smooth curves, perfect for visualising trends and changes over time.

**Best for:**
- Trends over time (daily sessions, weekly revenue)
- Spotting patterns, spikes, and dips
- Comparing multiple metrics on the same timeline

**Example prompts:**
- "Daily sessions for the last 30 days"
- "Weekly Google Ads spend trend for the past 3 months"
- "Plot daily pageviews vs bounce rate"
- "Mailchimp open rate trend over the last 6 months"

**Features:**
- Smooth curves with subtle area fill underneath
- Circle markers at each data point
- Multiple lines for comparing metrics (e.g. clicks and impressions)
- Auto-formatted date labels on x-axis

## Pie Chart

Pie charts (rendered as donut charts) show how parts make up a whole, making proportions immediately visible.

**Best for:**
- Showing proportions and distribution
- Traffic breakdowns (by channel, device, country)
- Budget allocation (spend by campaign)

**Example prompts:**
- "Traffic breakdown by device category"
- "Sessions by channel group as a pie chart"
- "Google Ads spend distribution by campaign"
- "LinkedIn follower demographics by industry"

**Features:**
- Donut style with rounded segments
- Interactive legend (top-right, scrollable)
- Hover emphasis with label and percentage
- Tooltip shows name, value, and percentage

## Sankey Diagram

Sankey diagrams visualise flows between nodes, with the width of each connection representing volume. They're powerful for understanding how users navigate through your site.

**Best for:**
- Page-to-page user flows
- Source → landing page → next page journeys
- Understanding drop-off points and popular paths

**Example prompts:**
- "Show me the user flow from the homepage"
- "Sankey diagram of page navigation paths"
- "Traffic source to landing page flow"

**Features:**
- Gradient-colored flow paths
- Hover highlights connected nodes
- Nodes sized by total flow volume
- Automatically filters to most significant paths (top 30)

**Note:** Sankey diagrams only include sessions with 2+ pageviews — single-page visits (bounces) have no page-to-page flow to show.

## Choosing the Right Chart

| Question Type | Best Chart | Example |
|---|---|---|
| "Top N by metric" | Bar | "Top 10 pages by sessions" |
| "Trend over time" | Line | "Daily users last 30 days" |
| "Breakdown of a total" | Pie | "Traffic by device type" |
| "User flow / paths" | Sankey | "Page navigation flow" |
| "Compare two metrics over time" | Line (multi-series) | "Clicks vs impressions daily" |
| "Compare categories" | Bar (multi-series) | "Spend by campaign: Google vs Microsoft" |

> **Tip:** You don't always need to specify the chart type. The AI will choose the best visualisation based on your question. But if you want a specific type, just include it in your prompt — e.g. "as a pie chart" or "show as a line chart".
`,
};

/* ------------------------------------------------------------------ */
/*  Seed                                                                */
/* ------------------------------------------------------------------ */

async function main() {
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
  console.log("Seeded: chart-types");
}

main()
  .then(() => {
    console.log("\nChart types doc seeded successfully.");
    return prisma.$disconnect();
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
