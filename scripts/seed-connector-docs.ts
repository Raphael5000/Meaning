/**
 * Seeds 8 Connector documentation articles into the database.
 *
 * Usage: npx tsx scripts/seed-connector-docs.ts
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Article content                                                    */
/* ------------------------------------------------------------------ */

const articles = [
  /* ================================================================ */
  /*  1. Connectors Overview                                           */
  /* ================================================================ */
  {
    slug: "connectors-overview",
    title: "Connectors Overview",
    description:
      "Link your marketing platforms to query all your data from one place.",
    section: "docs",
    category: "connectors",
    type: "article",
    readTime: "2 min read",
    featured: true,
    keywords: [
      "connectors",
      "overview",
      "platforms",
      "integrations",
      "data sources",
    ],
    content: `---
---

Connectors link your marketing platforms to Meaning. Once connected, data syncs automatically to your data warehouse. Query everything through AI chat, build dashboard widgets, and set up email alerts — all from a single interface.

<DocsDemo type="connectors-overview" />

## Supported Platforms

| Platform | What you get |
|---|---|
| **Google Analytics 4** | Website traffic, user behaviour, conversions |
| **Google Ads** | Campaign performance, keywords, spend |
| **Microsoft Ads** | Bing campaign performance, keywords, spend |
| **LinkedIn** | Company page analytics, post performance, followers |
| **Mailchimp** | Email campaign performance, audience growth |
| **Google Search Console** | Search queries, rankings, indexing |
| **Ahrefs** | Domain rating, keywords, backlinks, site audit |

## How Connections Work

1. **Authenticate via OAuth or API key** — secure, we never see your password.
2. **Select the account or property** you want to connect.
3. **Data syncs automatically** — you can start querying immediately.

<DocsDemo type="connector-data" />

## Data Freshness

- Data syncs automatically every day via scheduled jobs.
- Manual re-sync available from the Connections panel.
- Historical data backfilled on first connection.
`,
  },

  /* ================================================================ */
  /*  2. Google Analytics 4                                            */
  /* ================================================================ */
  {
    slug: "connect-ga4",
    title: "Google Analytics 4",
    description:
      "Connect your GA4 property to analyse website traffic, user behaviour, and conversions.",
    section: "docs",
    category: "connectors",
    type: "guide",
    readTime: "3 min read",
    featured: false,
    keywords: [
      "ga4",
      "google analytics",
      "traffic",
      "sessions",
      "conversions",
    ],
    content: `---
---

## Connecting GA4

1. Open **Connections** from the account menu.
2. Click **Connect** next to Google Analytics.
3. Sign in with your Google account and grant access.
4. Select your GA4 property from the list.
5. Click **Enable** — data begins syncing immediately.

## Available Data

| Category | Metrics |
|---|---|
| Traffic | Sessions, users, new users, pageviews |
| Engagement | Bounce rate, session duration, engagement time, pages per session |
| Sources | Source, medium, channel group, landing page |
| Geography | Country, city |
| Technology | Device category, browser, operating system |
| Conversions | Event name, conversion count |
| Real-time | Active users in the last 30 minutes with page, country, device breakdowns |

## Example Questions

- "How many sessions did we get this month?"
- "What are our top 10 landing pages?"
- "Show me traffic by source for the last 30 days"
- "What's our bounce rate on mobile vs desktop?"
- "Who is on our site right now?"

## Notes

- GA4 BigQuery export is enabled automatically when you connect.
- Historical data is backfilled for the available period.
- Real-time data covers the last 30 minutes.
`,
  },

  /* ================================================================ */
  /*  3. Google Ads                                                    */
  /* ================================================================ */
  {
    slug: "connect-google-ads",
    title: "Google Ads",
    description:
      "Connect Google Ads to track campaign performance, keywords, and return on ad spend.",
    section: "docs",
    category: "connectors",
    type: "guide",
    readTime: "3 min read",
    featured: false,
    keywords: [
      "google ads",
      "campaigns",
      "keywords",
      "roas",
      "ad spend",
      "ppc",
    ],
    content: `---
---

## Connecting Google Ads

1. Open **Connections** from the account menu.
2. Click **Connect** next to Google Ads.
3. Sign in and grant access to your Ads account.
4. Select the customer account from the list.
5. Click **Enable** to start syncing.

## Available Data

| Table | Key Columns |
|---|---|
| Campaign Performance | Date, campaign name, status, impressions, clicks, cost, conversions, conversion value |
| Keyword Performance | Date, campaign, ad group, keyword, match type, impressions, clicks, cost, conversions |
| Click Attribution | Click date, GCLID, campaign, ad group (links ad clicks to GA4 sessions) |
| Account Info | Customer ID, account name, currency code |

## Key Metrics

- **CTR** — clicks / impressions
- **CPC** — cost / clicks
- **ROAS** — conversion value / cost
- Cost is stored in your account's currency and automatically converted to your display currency.

## Example Questions

- "What's our total Google Ads spend this month?"
- "Top 5 campaigns by ROAS"
- "Show me daily ad spend as a line chart"
- "Which keywords have the highest CPC?"
- "Compare Google Ads vs Microsoft Ads performance"

## Notes

- Cost values are automatically converted to your organisation's display currency.
- Click attribution data can be joined with GA4 sessions via GCLID for full-funnel analysis.
`,
  },

  /* ================================================================ */
  /*  4. Microsoft Ads                                                 */
  /* ================================================================ */
  {
    slug: "connect-microsoft-ads",
    title: "Microsoft Ads",
    description:
      "Connect Microsoft Ads to track Bing campaign performance, keywords, and search queries.",
    section: "docs",
    category: "connectors",
    type: "guide",
    readTime: "3 min read",
    featured: false,
    keywords: [
      "microsoft ads",
      "bing",
      "campaigns",
      "search queries",
      "ppc",
    ],
    content: `---
---

## Connecting Microsoft Ads

1. Open **Connections** from the account menu.
2. Click **Connect** next to Microsoft Ads.
3. Sign in with your Microsoft account.
4. Select the advertising account from the list.
5. Click **Enable** to start syncing.

## Available Data

| Table | Key Columns |
|---|---|
| Campaign Performance | Date, campaign name, status, impressions, clicks, cost, conversions, conversion value, revenue |
| Keyword Performance | Date, campaign, ad group, keyword, match type, impressions, clicks, cost, conversions |
| Search Query Performance | Date, search query, campaign, ad group, impressions, clicks, cost, conversions |
| Account Info | Account ID, account name, currency code |

## Example Questions

- "Total Microsoft Ads spend this month"
- "Top search queries by clicks on Bing"
- "Compare Microsoft Ads CPC vs Google Ads CPC"
- "Which Microsoft Ads campaigns have the best conversion rate?"

## Cross-Platform Comparison

- Compare Google Ads and Microsoft Ads side by side.
- The AI runs separate queries and presents results together.
- Currency conversion is handled automatically.

## Notes

- Uses Azure AD for authentication.
- Account discovery uses SOAP API, reporting uses REST/JSON API.
- Custom date range syncs supported.
`,
  },

  /* ================================================================ */
  /*  5. LinkedIn                                                      */
  /* ================================================================ */
  {
    slug: "connect-linkedin",
    title: "LinkedIn",
    description:
      "Connect your LinkedIn Company Page to track post performance, follower growth, and audience demographics.",
    section: "docs",
    category: "connectors",
    type: "guide",
    readTime: "3 min read",
    featured: false,
    keywords: [
      "linkedin",
      "company page",
      "followers",
      "posts",
      "social media",
    ],
    content: `---
---

## Connecting LinkedIn

1. Open **Connections** from the account menu.
2. Click **Connect** next to LinkedIn.
3. Sign in with your LinkedIn account (must be a page admin).
4. Select your Company Page from the list.
5. Click **Enable** to start syncing.

## Available Data

| Table | Key Columns |
|---|---|
| Post Performance | Published date, post type, text preview, impressions, unique impressions, clicks, comments, likes, shares, engagements |
| Follower Stats | Date, total followers, organic gains, paid gains |
| Follower Demographics | Dimension (country, industry, seniority, function, company size), value, count |
| Page Stats | Date, page views, unique visitors |
| Org Info | Organisation name, vanity name |

## Example Questions

- "How many LinkedIn followers do we have?"
- "Show me our top posts by impressions"
- "What's our follower breakdown by country?"
- "How many posts did we publish this month?"
- "Bar chart of impressions by month for the last 12 months"

## Notes

- You must be an admin on the LinkedIn Company Page to connect.
- Post performance shows lifetime stats per post (the API does not provide time-bounded impression data).
- Follower demographics are a point-in-time snapshot, refreshed daily.
- Page stats (page views) are cumulative lifetime totals.
`,
  },

  /* ================================================================ */
  /*  6. Mailchimp                                                     */
  /* ================================================================ */
  {
    slug: "connect-mailchimp",
    title: "Mailchimp",
    description:
      "Connect Mailchimp to track email campaign performance, open rates, and audience growth.",
    section: "docs",
    category: "connectors",
    type: "guide",
    readTime: "3 min read",
    featured: false,
    keywords: [
      "mailchimp",
      "email",
      "campaigns",
      "open rate",
      "audience",
      "newsletter",
    ],
    content: `---
---

## Connecting Mailchimp

1. Open **Connections** from the account menu.
2. Click **Connect** next to Mailchimp.
3. Sign in to your Mailchimp account.
4. Select the audience (list) you want to track.
5. Click **Enable** to start syncing.

## Available Data

| Table | Key Columns |
|---|---|
| Campaign Reports | Send date, campaign title, subject line, emails sent, opens, unique opens, open rate, clicks, unique clicks, click rate, bounces, unsubscribes, revenue |
| Audience Stats | Date, list name, member count, total contacts, unsubscribes, cleaned contacts, open rate, click rate |
| Audience Growth | Month, subscribed, unsubscribed, cleaned, pending |
| Account Info | Account name, data centre, list ID, list name |

## Key Metrics

- **Open Rate** — Use \`proxy_excluded_open_rate\` for accuracy (Apple Mail Privacy inflates the standard open rate).
- **Click Rate** — Unique clicks / emails delivered.
- Audience growth data is monthly (one row per month).

## Example Questions

- "What was the open rate on our last campaign?"
- "Show me emails sent per month as a bar chart"
- "Which campaign had the highest click rate?"
- "How has our audience grown over the last 12 months?"
- "Total unsubscribes this quarter"

## Notes

- Mailchimp tokens don't expire — no need to reconnect.
- Open rate is available as both standard and proxy-excluded (recommended for accuracy).
- Audience growth is tracked monthly, not daily.
`,
  },

  /* ================================================================ */
  /*  7. Google Search Console                                         */
  /* ================================================================ */
  {
    slug: "connect-gsc",
    title: "Google Search Console",
    description:
      "Connect Search Console to track search queries, rankings, click-through rates, and indexing status.",
    section: "docs",
    category: "connectors",
    type: "guide",
    readTime: "3 min read",
    featured: false,
    keywords: [
      "search console",
      "gsc",
      "seo",
      "search queries",
      "rankings",
      "indexing",
    ],
    content: `---
---

## Connecting Search Console

1. Open **Connections** from the account menu.
2. Click **Connect** next to Search Console.
3. Sign in with your Google account and grant access.
4. Select your verified site property (requires owner or full access).
5. Click **Enable** to start syncing.

## Available Data

| Table | Key Columns |
|---|---|
| Search Performance | Date, search query, page URL, country, device, clicks, impressions, CTR, average position |
| URL Inspection | Date, URL, index verdict (PASS/FAIL), coverage state, page fetch state, last crawl time, canonical URLs, mobile verdict |
| Site Info | Site URL, permission level |

## Key Metrics

- **CTR** — Stored as a decimal (0-1), not a percentage. 0.05 = 5%.
- **Position** — Lower is better. Position 1 = top of search results.
- **Index Verdict** — PASS means the page is indexed, FAIL means it's not.

## Example Questions

- "What are our top search queries by clicks?"
- "Show me average position trend for the last 90 days"
- "Which pages have the most impressions but low CTR?"
- "How many pages are indexed vs not indexed?"
- "Show me crawl errors from the last week"

## GA4 vs Search Console Data

- GA4 "google" traffic includes ALL Google traffic (organic, paid, YouTube, Gmail, Discover).
- Search Console only counts organic search clicks.
- These numbers will not match — this is expected.
- For organic search analysis, Search Console is more accurate.

## Notes

- You must have owner or full user access to the Search Console property.
- CTR values are 0-1 decimals (multiply by 100 for percentage).
- BigQuery uses \`INTERVAL N DAY\` (singular) — not DAYS or MONTHS.
`,
  },

  /* ================================================================ */
  /*  8. Ahrefs                                                        */
  /* ================================================================ */
  {
    slug: "connect-ahrefs",
    title: "Ahrefs",
    description:
      "Connect Ahrefs to track domain authority, organic keywords, backlinks, and site audit health.",
    section: "docs",
    category: "connectors",
    type: "guide",
    readTime: "3 min read",
    featured: false,
    keywords: [
      "ahrefs",
      "seo",
      "domain rating",
      "backlinks",
      "keywords",
      "site audit",
    ],
    content: `---
---

## Connecting Ahrefs

1. Open **Connections** from the account menu.
2. Click **Connect** next to Ahrefs.
3. Paste your Ahrefs API key (generate one at [app.ahrefs.com/user/api](https://app.ahrefs.com/user/api)).
4. Select your project from the list, or enter a domain manually.
5. Click **Enable** — data syncs immediately.

## Getting Your API Key

1. Go to [app.ahrefs.com/user/api](https://app.ahrefs.com/user/api).
2. Click **Generate API Key** (requires an Ahrefs subscription with API access).
3. Copy the key and paste it into the Ahrefs connection form in Meaning.

Your API key is stored securely and only used to fetch your SEO data.

## Available Data

| Table | Key Columns |
|---|---|
| Site Metrics | Organic keywords, top-3 keywords, organic traffic, organic cost, paid keywords, paid traffic |
| Domain Rating | Domain Rating (0-100), Ahrefs Rank |
| Backlinks Stats | Live backlinks, all-time backlinks, live referring domains, all-time referring domains |
| Organic Keywords | Keyword, position, search volume, traffic, CPC, keyword difficulty, URL, intent flags |
| Top Pages | URL, keyword count, traffic, traffic value, top keyword, URL Rating |
| Referring Domains | Domain, DR, dofollow links, links to target, traffic, first/last seen, spam flag |
| Site Audit Health | Health score (0-100), total URLs, URLs with errors, warnings, notices |
| Site Audit Issues | Issue name, severity (Error/Warning/Notice), category, affected URLs, change vs previous crawl |

## Key Metrics

- **Domain Rating (DR)** — 0-100 score measuring the strength of a domain's backlink profile.
- **Keyword Difficulty (KD)** — 0-100 score estimating how hard it is to rank in the top 10.
- **CPC** — Stored in USD cents (divide by 100 for dollars).
- **Health Score** — Percentage of internal URLs without errors.
- **Traffic** — Estimated monthly organic visits.

## Example Questions

- "What's our domain rating?"
- "Top 10 organic keywords by traffic"
- "Show me our backlink growth over time"
- "What SEO errors does our site have?"
- "Which referring domains have the highest DR?"
- "What's our site audit health score?"
- "Show me keyword difficulty distribution"

## Ahrefs vs Search Console

- **Ahrefs** provides estimated metrics from its own crawler and index — useful for competitor analysis, keyword research, and backlink monitoring.
- **Search Console** provides actual click and impression data from Google Search — the ground truth for your own site's search performance.
- Use both together: Search Console for real performance, Ahrefs for competitive intelligence and site health.

## Notes

- API keys don't expire — no need to reconnect.
- Data syncs daily at 06:00 UTC with a retry at 12:00 UTC.
- Organic keywords are limited to the top 500 by traffic per sync.
- Top pages limited to top 100 by traffic.
- Referring domains limited to top 200 by traffic.
- Site Audit data requires an active Site Audit project in Ahrefs for the connected domain.
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
    console.log("\nAll 8 Connector docs seeded successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
