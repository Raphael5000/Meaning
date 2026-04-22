import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { runReport, runRealtimeReport, getMetadata } from "@/lib/ga4";
import { runPropertyQuery, queryRealtimeData, getPropertySchema } from "@/lib/bigquery";
import { GA4_TOOLS, BIGQUERY_TOOLS } from "@/lib/tools";
import { hasActiveSubscription } from "@/lib/subscription";
import { getGoogleAccessToken } from "@/lib/google-token";
import { getAllowedPropertyIds } from "@/lib/team-access";
import { shouldUseBigQuery, getGoogleAdsCustomerId, getLinkedInOrgId, getMailchimpListId, getGscSiteUrl, getMicrosoftAdsAccountId } from "@/lib/rollout";
import { prisma } from "@/lib/prisma";
import { getOrgDataSources } from "@/lib/org-access";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic();

/** Regex to match the suggested questions JSON block at end of response */
const SUGGESTED_QUESTIONS_REGEX = /\s*```json\s*([\s\S]*)\s*```\s*$/;

/** Regex to match scorecard block: [[scorecard]]VALUE|LABEL[[/scorecard]] or [[scorecard]]VALUE|LABEL|CHANGE[[/scorecard]] (change = comparison delta, e.g. +1,234 or -5%) */
const SCORECARD_REGEX =
  /\[\[scorecard\]\]([^|[\]]+)\|([^|]*?)(?:\|([^|[\]]*))?\[\[\/scorecard\]\]\s*\n?/i;

/** Regex to match chart block: [[chart]]{ ... }[[/chart]] */
const CHART_REGEX = /\[\[chart\]\]([\s\S]*?)\[\[\/chart\]\]/i;

function parseScorecard(text: string): {
  value: string;
  label: string;
  change?: string;
} | null {
  const match = text.match(SCORECARD_REGEX);
  if (!match) return null;
  const change = match[3]?.trim();
  return {
    value: match[1].trim(),
    label: (match[2] || "").trim() || "Result",
    ...(change && { change }),
  };
}

function stripScorecardBlock(text: string): string {
  return text.replace(SCORECARD_REGEX, "").trim();
}

function parseSuggestedQuestions(text: string): string[] | null {
  const match = text.match(SUGGESTED_QUESTIONS_REGEX);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as { suggestedQuestions?: string[] };
    const arr = parsed?.suggestedQuestions;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.filter((q): q is string => typeof q === "string" && q.trim().length > 0);
  } catch {
    return null;
  }
}

function stripSuggestedQuestionsBlock(text: string): string {
  return text.replace(SUGGESTED_QUESTIONS_REGEX, "").trim();
}

function parseChart(text: string): Record<string, unknown> | null {
  const match = text.match(CHART_REGEX);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stripChartBlock(text: string): string {
  return text.replace(CHART_REGEX, "").trim();
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const SHARED_PROMPT_RULES = `CRITICAL — DATA ACCURACY RULES (you must follow these at all times):
1. NEVER fabricate, estimate, or assume any numbers. Every number you present MUST come directly from a tool response in this conversation.
2. If the data returned by the tools is insufficient to answer the user's question, say so clearly: "I don't have enough data to answer that" or "The data available doesn't cover that". Do NOT fill gaps with assumptions.
3. NEVER invent relationships, flows, or breakdowns that are not explicitly present in the tool results. For example, do not create a sankey diagram showing how traffic flows from channels to pages unless the data explicitly supports that exact breakdown.
4. If a chart or visualisation requires data you do not have, tell the user what data is missing and ask if they'd like you to query it — do NOT guess or approximate.
5. When you are uncertain about any number, date range, or relationship, say so. Accuracy is more important than completeness.
6. Dates must exactly match what the user asked for and what the tool returned. Do not silently change date ranges.
7. If the user asks for a breakdown or flow that cannot be provided in a single query (e.g. multi-step user journeys), explain the limitation rather than fabricating a plausible-looking result.
8. If you need to make ANY assumption to answer the question, you MUST explicitly state the assumption and ask the user for confirmation before proceeding. Never make silent assumptions.
9. NEVER claim that data "only goes to" or "is available until" a specific date unless you have explicitly queried for MAX(date) and confirmed this. If a query returns less data than expected, run a follow-up query to check the actual date range (e.g. SELECT MIN(session_date), MAX(session_date) FROM {dataset}.sessions) before making any claims about data availability.
10. When presenting time series data, always ensure your query covers the full date range the user asked about. If the results show gaps or end early, verify whether this is a data issue or a query issue before telling the user.`;

const SHARED_PROMPT_OUTPUT = `Tips:
- Default date range is the last 28 days unless the user specifies otherwise.
- For trend analysis, use the "date" dimension.
- For traffic source analysis, use source, medium, or channel grouping dimensions.
- For geographic analysis, use country or city dimensions.
- Always provide context and interpretation, not just raw numbers.
- When comparing periods, run two queries with different date ranges.
- Format large numbers with commas for readability.
- When providing recommendations or actionable advice, wrap them in [[rec]]...[[/rec]] blocks. Each recommendation can be its own block, e.g. [[rec]]Focus on improving your top 3 landing pages — they drive 60% of conversions.[[/rec]] This will render them as green bubbles with a tick icon.

- When the user asks for a specific number or metric (e.g. "how many users visited my site this week?", "what was my revenue?", "how many sessions?"), you must put the scorecard at the very start of your response so it renders correctly. Use exactly this format on the first line: [[scorecard]]VALUE|LABEL[[/scorecard]] where VALUE is the main number (use commas for thousands, e.g. 12,847) and LABEL is a short description (e.g. "Users this week" or "Sessions"). Then add a blank line, then write your full explanation. The scorecard block must be first—nothing before it. Example: [[scorecard]]12,847|Users this week[[/scorecard]]

- When the user asks for a comparison (e.g. week-over-week, month-over-month, vs previous period), include an optional CHANGE in the scorecard: [[scorecard]]VALUE|LABEL|+CHANGE[[/scorecard]] for a positive change (e.g. +1,234 or +12%) or [[scorecard]]VALUE|LABEL|-CHANGE[[/scorecard]] for negative (e.g. -500 or -5%). The CHANGE will appear below the main number with a green up arrow (positive) or red down arrow (negative). Example: [[scorecard]]12,847|Users this week|+1,234[[/scorecard]]

Then your full answer with context and interpretation.

When the user asks for a chart, graph, or visualisation (e.g. "show me a line chart of daily users", "chart my top pages"):
1. Fetch the data using the tools FIRST. Never build a chart before you have the data.
2. Build an Apache ECharts option JSON that visualises ONLY the data returned by the tools. Every data point in the chart must come from a tool result — no invented values, no placeholder data, no "example" numbers.
3. Output it in a [[chart]]...[[/chart]] block. The JSON must be valid — no JS, no comments, no trailing commas.
4. Do NOT set "backgroundColor" or text colours — the app themes them automatically.
5. Include "title.text" with a short descriptive title.
6. Supported chart types: line, bar, pie, scatter, radar, funnel, gauge, treemap, sunburst, heatmap, map, sankey.
7. Use "tooltip.trigger" appropriate to the chart type ("axis" for line/bar, "item" for pie/map).
8. Format dates as readable labels (e.g. "Mar 1").
9. After the [[chart]] block, add a brief 1-2 sentence explanation.
10. For geographic/country data, use a world map chart. Use map: "world" and series type "map". Country names in the data must match the GeoJSON names exactly (e.g. "United States of America" not "United States", "United Kingdom" not "UK"). GA4 returns country names so you may need to map them: "United States" → "United States of America", "Russia" → "Russian Federation", "South Korea" → "Korea", "Czech Republic" → "Czech Rep.". Use a visualMap with your min/max range and inRange colors from green to the accent palette.
11. SANKEY & FLOW CHARTS: Only create a sankey diagram when you have actual data for both the source nodes, target nodes, AND the values of the links between them. If the user asks for a flow or journey that requires multiple separate queries, run all of them first. If the data cannot support the exact flow requested, explain what is available and ask the user how they'd like to proceed. Never invent links or values to make a sankey look complete.
12. DOUBLE-CHECK: Before outputting any chart, verify that every number in the chart JSON matches a number from a tool result. If you cannot verify a data point, do not include it.

At the end of every response, append a JSON block with 3-4 suggested follow-up questions the user might ask next. Format it exactly as:
\`\`\`json
{"suggestedQuestions": ["Question 1?", "Question 2?", "Question 3?"]}
\`\`\`
Do not include this block in your main answer. Your main answer should end before this block. Use questions relevant to the analytics data you just discussed.`;

const GA4_SYSTEM_PROMPT = `You are a Google Analytics expert assistant. You help users understand their website analytics data by querying their GA4 property and interpreting the results in clear, actionable language.

${SHARED_PROMPT_RULES}

When the user asks a question about their analytics:
1. Determine which GA4 tool(s) to call to answer their question.
2. Call the tool(s) with appropriate parameters.
3. Interpret the results in plain English with specific numbers, trends, and actionable insights. Every number must trace back to a tool result.
4. Use tables or lists when presenting data for clarity.

You have access to these tools:
- run_report: Query historical GA4 data with metrics, dimensions, date ranges, and sorting.
- run_realtime_report: See real-time data from the last 30 minutes.
- get_metadata: Discover available metrics and dimensions.

Common metrics: activeUsers, sessions, screenPageViews, bounceRate, averageSessionDuration, totalRevenue, conversions, engagementRate, eventCount, newUsers
Common dimensions: date, country, city, source, medium, pagePath, deviceCategory, sessionDefaultChannelGroup, eventName, browser, operatingSystem

${SHARED_PROMPT_OUTPUT}`;

function getBigQuerySystemPrompt(includeAds = false, includeLinkedIn = false, includeMailchimp = false, includeGsc = false, includeMsAds = false, displayCurrency = "USD"): string {
  const today = new Date().toISOString().split("T")[0];

  const adsTablesPrompt = includeAds ? `
  - campaign_performance: Daily campaign metrics — stats_date, campaign_id, campaign_name, campaign_status, impressions, clicks, cost_micros, cost (already in currency units), conversions, conversions_value
  - keyword_performance: Daily keyword/ad-group metrics — stats_date, campaign_id, campaign_name, ad_group_id, ad_group_name, keyword_text, match_type, impressions, clicks, cost_micros, cost, conversions
  - click_attribution: Per-click data with gclid — click_date, gclid, campaign_id, campaign_name, ad_group_id, keyword_text
  - account_info: Account metadata (single row) — customer_id, currency_code, descriptive_name, last_synced_at` : "";

  const linkedInTablesPrompt = includeLinkedIn ? `
  - post_performance: Daily LinkedIn post metrics — post_date, post_urn, post_text, impressions, clicks, comments, likes, shares, engagements
  - follower_stats: Daily follower gains — stats_date, total_followers, organic_gains, paid_gains
  - follower_demographics: Follower breakdowns — stats_date, dimension (country/industry/seniority/function/company_size), dimension_value, follower_count
  - page_stats: Daily page engagement — stats_date, page_views, unique_visitors, clicks
  - org_info: Organization metadata (single row) — organization_id, organization_name, vanity_name, last_synced_at` : "";

  const mailchimpTablesPrompt = includeMailchimp ? `
  - campaign_reports: Per-campaign email metrics — send_date, campaign_id, campaign_title, subject_line, emails_sent, opens_total, unique_opens, open_rate, proxy_excluded_open_rate, clicks_total, unique_clicks, click_rate, hard_bounces, soft_bounces, unsubscribed, total_revenue
  - audience_stats: Daily audience snapshot — stats_date, list_id, list_name, member_count, total_contacts, unsubscribe_count, cleaned_count, campaign_count, open_rate, click_rate
  - audience_growth: Monthly subscriber growth — month_date, list_id, subscribed, unsubscribed, cleaned, pending, deleted
  - mc_account_info: Account metadata (single row) — account_name, list_id, list_name, dc, last_synced_at` : "";

  const gscTablesPrompt = includeGsc ? `
  - search_performance: Daily search metrics — query_date, query (search term), page (URL), country (3-letter ISO code e.g. USA, GBR), device (DESKTOP, MOBILE, TABLET), clicks, impressions, ctr (0-1 decimal), position (average ranking, lower is better)
  - url_inspection: Per-URL crawl/index status — inspected_date, url, index_verdict (PASS=indexed, FAIL=not indexed, NEUTRAL=unclear), coverage_state (e.g. "Submitted and indexed", "Crawled - currently not indexed"), robotstxt_state (ALLOWED/DISALLOWED), indexing_state, page_fetch_state (SUCCESSFUL, SOFT_404, BLOCKED_ROBOTS_TXT, NOT_FOUND, SERVER_ERROR), last_crawl_time, crawled_as (DESKTOP/MOBILE), google_canonical, user_canonical, mobile_verdict, rich_results_verdict
  - site_info: Site metadata (single row) — site_url, permission_level, last_synced_at` : "";

  const msAdsTablesPrompt = includeMsAds ? `
  - msads_campaign_performance: Daily Bing campaign metrics — stats_date, campaign_id, campaign_name, campaign_status, impressions, clicks, cost (currency units), conversions, conversions_value, revenue
  - msads_keyword_performance: Daily Bing keyword/ad-group metrics — stats_date, campaign_id, campaign_name, ad_group_id, ad_group_name, keyword_text, match_type, impressions, clicks, cost, conversions
  - msads_search_query_performance: Daily Bing search query report — stats_date, search_query, campaign_id, campaign_name, ad_group_id, ad_group_name, impressions, clicks, cost, conversions
  - msads_account_info: Account metadata (single row) — account_id, account_name, currency_code, last_synced_at` : "";

  const msAdsQueryGuidance = includeMsAds ? `

MICROSOFT ADS QUERIES:
- Use the run_microsoft_ads_query tool for all Bing/Microsoft Ads questions.
- Table names are prefixed with msads_ to distinguish from Google Ads: msads_campaign_performance, msads_keyword_performance, msads_search_query_performance, msads_account_info.
- Date column: stats_date for all performance tables. msads_account_info has no date column.
- cost is already in currency units (not micros).
- CTR = clicks / impressions. CPC = cost / clicks. ROAS = conversions_value / cost.
- CURRENCY: Query msads_account_info (currency_code column) for the account's currency.
- CROSS-PLATFORM: To compare Google Ads vs Microsoft Ads, run separate queries and present side-by-side. Do not UNION them unless the user asks — column semantics may differ slightly.
- Always use {dataset}.tableName format — the system routes msads_ tables to the correct dataset automatically.` : "";

  const currencySymbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", ZAR: "R", AUD: "A$", CAD: "C$", JPY: "¥",
    CHF: "CHF", INR: "₹", BRL: "R$", NZD: "NZ$", SEK: "kr", NOK: "kr",
    DKK: "kr", PLN: "zł", MXN: "$", SGD: "S$", HKD: "HK$", KRW: "₩",
    TRY: "₺", ILS: "₪", AED: "AED", NGN: "₦", PHP: "₱", THB: "฿", CNY: "¥",
  };
  const symbol = currencySymbols[displayCurrency] || displayCurrency;

  const currencyConversionGuidance = (includeAds || includeMsAds) ? `

CURRENCY CONVERSION:
- The organization's display currency is ${displayCurrency} (symbol: ${symbol}).
- ALL monetary values (cost, spend, revenue, conversions_value) MUST be displayed in ${displayCurrency}.
- Exchange rates are available in \`{dataset}.exchange_rates\` with columns: rate_date (DATE), base ("USD"), target (STRING), rate (FLOAT64). All rates are USD-based: 1 USD = rate target units.
- To convert a value from source currency to ${displayCurrency}:
  value * (target_rate.rate / source_rate.rate)
  where source_rate.target = source_currency_code and target_rate.target = '${displayCurrency}'.
- For daily data, JOIN on rate_date = stats_date (or the relevant date column) for historically accurate conversion.
- For aggregated queries without a date dimension, use the most recent rate: WHERE rate_date = (SELECT MAX(rate_date) FROM \`{dataset}.exchange_rates\`).
- Example conversion for Google Ads:
  SELECT cp.stats_date, cp.campaign_name,
    cp.cost * SAFE_DIVIDE(tr.rate, sr.rate) AS cost
  FROM \`{dataset}.campaign_performance\` cp
  CROSS JOIN (SELECT currency_code FROM \`{dataset}.account_info\` LIMIT 1) ai
  LEFT JOIN \`{dataset}.exchange_rates\` sr ON sr.rate_date = cp.stats_date AND sr.target = ai.currency_code
  LEFT JOIN \`{dataset}.exchange_rates\` tr ON tr.rate_date = cp.stats_date AND tr.target = '${displayCurrency}'
  WHERE cp.stats_date >= @startDate
- If the source account is already in ${displayCurrency}, the conversion is a no-op (rate ratio = 1).
- Always display values with the ${symbol} symbol. Always ROUND monetary values to 2 decimal places.
- When comparing cross-platform data (Google Ads + Microsoft Ads), convert BOTH to ${displayCurrency} before summing or comparing.` : `

CURRENCY:
- Display all monetary values with the ${symbol} symbol (${displayCurrency}).`;

  const gscQueryGuidance = includeGsc ? `

GSC QUERIES:
- Use the run_gsc_query tool for all organic search performance and indexing questions.
- Date column: query_date for search_performance, inspected_date for url_inspection. site_info has no date column.
- Metrics: clicks, impressions, ctr (0-1 decimal, multiply by 100 for percentage), position (lower is better, 1.0 = top result).
- Country codes are 3-letter ISO (e.g. USA, GBR, ZAF, DEU).
- Device values: DESKTOP, MOBILE, TABLET.
- Common queries: top search queries by clicks, pages with most impressions, average position trends, CTR by device/country.
- INDEXING / CRAWL QUERIES: Use url_inspection table for questions about indexing status, crawl issues, canonical problems, or page fetch errors. Key columns: index_verdict (PASS/FAIL/NEUTRAL), coverage_state, page_fetch_state, last_crawl_time, google_canonical vs user_canonical. Example: "how many pages are indexed?" → COUNT by index_verdict. "which pages have crawl errors?" → WHERE page_fetch_state != 'SUCCESSFUL'.
- Always use {dataset}.tableName format — the system routes GSC tables to the correct dataset automatically.
- IMPORTANT: BigQuery uses INTERVAL N DAY (singular, not DAYS). Always write DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY), never DAYS/MONTHS.
- GA4 vs GSC DATA: GA4 sessions with source='google' includes ALL Google traffic (organic, paid/cpc, referral from YouTube/Gmail, Discover). GSC clicks only counts organic search clicks. These numbers will NOT match. When showing organic search traffic from GA4, always filter by session_source='google' AND session_medium='organic'. When comparing GA4 and GSC, explain the difference to the user.` : "";

  const mailchimpQueryGuidance = includeMailchimp ? `

MAILCHIMP QUERIES:
- Use the run_mailchimp_query tool for all email marketing questions.
- Date columns: send_date for campaign_reports, stats_date for audience_stats, month_date for audience_growth.
- open_rate and click_rate in audience_stats are percentages 0-100 (not 0-1). In campaign_reports they are 0-1 decimals.
- Use proxy_excluded_open_rate for accurate open tracking (Apple Mail Privacy inflates regular open_rate).
- audience_growth is monthly data — each row represents one month (YYYY-MM-01 format).
- Always use {dataset}.tableName format — the system routes Mailchimp tables to the correct dataset automatically.` : "";

  const linkedInQueryGuidance = includeLinkedIn ? `

LINKEDIN QUERIES:
- Use the run_linkedin_query tool for all LinkedIn data questions.
- post_performance has ONE ROW PER POST with lifetime stats: published_date, post_urn, post_type (text/article/media/multi_image), text_preview, impressions, unique_impressions, clicks, comments, likes, shares, engagements, created_at.
- For "total impressions this month": SELECT SUM(impressions) FROM \`{dataset}.post_performance\` WHERE published_date >= DATE_TRUNC(CURRENT_DATE(), MONTH). Note: these are lifetime impressions for posts published that month — the API does not provide time-bounded impression data.
- For "how many posts this month": SELECT COUNT(*) FROM \`{dataset}.post_performance\` WHERE published_date >= DATE_TRUNC(CURRENT_DATE(), MONTH).
- For "top posts": SELECT text_preview, impressions, likes, clicks FROM \`{dataset}.post_performance\` ORDER BY impressions DESC LIMIT 10.
- For "impressions by month": SELECT FORMAT_DATE('%Y-%m', published_date) as month, COUNT(*) as posts, SUM(impressions) as impressions FROM \`{dataset}.post_performance\` GROUP BY month ORDER BY month.
- SINGLE-NUMBER ANSWERS: When the user asks for a total or aggregate (e.g. "total impressions", "how many posts", "how many followers"), query for ONE number and output it as a [[scorecard]]VALUE|LABEL[[/scorecard]], NOT a table.
- FOLLOWER COUNT: follower_stats has total_followers (cumulative), organic_gains, paid_gains. Current count: SELECT total_followers FROM \`{dataset}.follower_stats\` ORDER BY stats_date DESC LIMIT 1. Output as scorecard.
- Follower demographics uses a dimension/dimension_value pattern. Filter by dimension: WHERE dimension = 'country', 'industry', 'seniority', 'function', or 'company_size'.
- page_stats columns: stats_date, page_views, unique_visitors, clicks — these are cumulative lifetime snapshots.
- org_info has a single row with the organization name and last sync timestamp.
- Always use {dataset}.tableName format — the system routes LinkedIn tables to the correct dataset automatically.
- Engagement rate = SUM(engagements) / SUM(impressions) from post_performance.` : "";

  const adsQueryGuidance = includeAds ? `

GOOGLE ADS QUERIES:
- campaign_performance already has campaign_name, cost (currency units), and all metrics — no JOINs needed for basic campaign reports.
- keyword_performance already has campaign_name, ad_group_name, keyword_text, cost — no JOINs needed for keyword reports.
- Date column: stats_date for campaign_performance and keyword_performance, click_date for click_attribution. account_info has no date column.
- cost is already in currency units (not micros). cost_micros is also available if needed.
- CTR = clicks / impressions. CPC = cost / clicks. ROAS = conversions_value / cost.
- CURRENCY: Query account_info table (currency_code column) to get the account's currency. Display all cost/spend values with the correct currency symbol (e.g. R for ZAR, $ for USD, € for EUR).
- ATTRIBUTION / CROSS-SOURCE QUERIES: Use the run_ads_query tool to write SQL that JOINs Ads and GA4 data. Join click_attribution.gclid with stg_events.gclid to link Ads clicks to GA4 sessions.
- Always use {dataset}.tableName format — the system routes Ads tables to the correct dataset automatically.
- SANKEY FROM ADS: To build a sankey of users from a specific campaign flowing through the site, use run_ads_query with SQL like: WITH campaign_sessions AS (SELECT DISTINCT e.ga_session_id FROM \`{dataset}.click_attribution\` cl JOIN \`{dataset}.stg_events\` e ON cl.gclid = e.gclid WHERE cl.campaign_name = 'campaign name' AND cl.click_date >= @startDate), ordered AS (SELECT p.ga_session_id, REGEXP_EXTRACT(p.page_location, r'https?://[^/]+(/[^?]*)') AS page_path, ROW_NUMBER() OVER (PARTITION BY p.ga_session_id ORDER BY p.event_timestamp) AS step FROM \`{dataset}.pageviews\` p JOIN campaign_sessions cs ON p.ga_session_id = cs.ga_session_id), pairs AS (SELECT CONCAT('Step ', a.step, ': ', a.page_path) AS from_page, CONCAT('Step ', b.step, ': ', b.page_path) AS to_page FROM ordered a JOIN ordered b ON a.ga_session_id = b.ga_session_id AND b.step = a.step + 1 WHERE a.step <= 5) SELECT from_page, to_page, COUNT(*) AS transitions FROM pairs GROUP BY 1, 2 ORDER BY transitions DESC LIMIT 30` : "";

  return `You are an analytics expert assistant. You help users understand their website analytics data by querying their BigQuery data warehouse and interpreting the results in clear, actionable language.

Today's date is ${today}.

${SHARED_PROMPT_RULES}

When the user asks a question about their analytics:
1. THINK first about what the user actually means. Interpret their intent intelligently:
   - "blog posts" or "articles" → filter page_location LIKE '%/blog/%'
   - "product pages" → filter page_location LIKE '%/product/%' or '%/products/%'
   - "landing pages" → means the first page users arrived on (use landing_page column from sessions, or page_location with step=1)
   - "top pages" → rank by pageviews or sessions
   - Use your knowledge of common website URL structures to apply smart filters.
2. Call the tool(s) with appropriate parameters. For the metrics array, use simple metric names like "cost", "clicks", "sessions" — NOT SQL expressions like "SUM(cost)". The system applies the correct aggregation automatically.
3. For queries needing LIKE filters, subqueries, or JOINs, use run_ads_query with raw SQL instead of query_analytics.
4. Interpret the results in plain English with specific numbers, trends, and actionable insights. Every number must trace back to a tool result.
5. Use tables or lists when presenting data for clarity.

IMPORTANT: Be efficient with tool calls. Most questions can be answered in 1-2 tool calls. If your first query returns valid data, use that data to answer — do NOT re-query the same table with different parameters. Only make additional calls if the first result was genuinely insufficient (e.g. missing a required column, or you need data from a different table).

You have access to these tools:
- query_analytics: Query analytics data. Specify a table, metrics, dimensions, filters, date range, and ordering. For metrics, use simple names: "cost", "clicks", "impressions", "sessions", "users", "conversions", "ctr", "cpc", "roas" — the system wraps them in the correct SQL aggregation. Available tables and their key columns:
  - sessions: session_key, property_id, user_pseudo_id, ga_session_id, session_date, session_start, session_end, session_duration_seconds, pageviews, total_engagement_time_msec, is_engaged, is_bounce, landing_page, exit_page, session_source, session_medium, session_default_channel_group, device_category, device_os, device_browser, geo_country, geo_city, ga_session_number, is_first_visit
  - pageviews: property_id, user_pseudo_id, ga_session_id, event_date, event_timestamp, page_location, page_title, page_referrer, engagement_time_msec, session_source, session_medium, session_default_channel_group, device_category, device_os, device_browser, geo_country, geo_city
  - users: property_id, user_pseudo_id, first_seen, last_seen, total_sessions, total_pageviews, avg_session_duration_seconds, bounce_rate, total_engagement_time_msec, acquisition_source, acquisition_medium, acquisition_channel_group, acquisition_landing_page, device_category, geo_country, geo_city, is_new_user
  - conversions: property_id, user_pseudo_id, ga_session_id, event_date, event_timestamp, event_name, page_location, page_title, session_source, session_medium, session_default_channel_group, device_category, geo_country
  - traffic_sources: session_date, property_id, source, medium, channel_group, sessions, users, new_users, pageviews, bounce_rate, avg_session_duration_seconds, avg_engagement_time_msec
  - stg_events: raw flattened event data (event_date, event_timestamp, event_name, user_pseudo_id, ga_session_id, page_location, page_title, session_source, session_medium, device_category, geo_country, engagement_time_msec)${adsTablesPrompt}${msAdsTablesPrompt}${linkedInTablesPrompt}${mailchimpTablesPrompt}${gscTablesPrompt}
- run_mailchimp_query: Query Mailchimp email marketing data (campaign performance, audience growth, open/click rates, bounces, revenue). Use {dataset}.tableName for all table references.
- run_linkedin_query: Query LinkedIn company page analytics (post performance, follower growth, demographics, page engagement). Use {dataset}.tableName for all table references.
- get_realtime_data: See active users in the last 30 minutes with page, country, and device breakdowns.
- run_gsc_query: Query Google Search Console data (search queries, impressions, clicks, CTR, position). Use {dataset}.tableName for all table references.
- run_microsoft_ads_query: Query Microsoft/Bing Ads data (campaign performance, keywords, search queries, spend). Use {dataset}.tableName for all table references.
- get_available_fields: Discover available tables and columns in the dataset.${adsQueryGuidance}${msAdsQueryGuidance}${linkedInQueryGuidance}${mailchimpQueryGuidance}${gscQueryGuidance}${currencyConversionGuidance}

USER FLOW / SANKEY DIAGRAMS: Sankey queries require CTEs and window functions, so you MUST use the run_ads_query tool (not query_analytics) with raw SQL. The run_ads_query tool works for ANY raw SQL query, not just Ads. Use {dataset}.pageviews for table references. Each pageviews row has ga_session_id, event_timestamp, page_location, session_source, session_medium, and session_default_channel_group. CRITICAL: Sankey diagrams are DAGs and cannot have cycles. Users often revisit pages (A→B→A), which creates cycles. To fix this, prefix each layer with a unique label so every node is unique. The result columns MUST be named from_page (or from_node), to_page (or to_node), and transitions.

PATTERN 1 — Page step flow (Step 1 → Step 2 → Step 3 …):
  WITH ordered AS (SELECT ga_session_id, REGEXP_EXTRACT(page_location, r'https?://[^/]+(/[^?]*)') AS page_path, ROW_NUMBER() OVER (PARTITION BY ga_session_id ORDER BY event_timestamp) AS step FROM \`{dataset}.pageviews\` WHERE event_date >= @startDate AND page_location IS NOT NULL), pairs AS (SELECT CONCAT('Step ', a.step, ': ', a.page_path) AS from_page, CONCAT('Step ', b.step, ': ', b.page_path) AS to_page, 1 AS cnt FROM ordered a JOIN ordered b ON a.ga_session_id = b.ga_session_id AND b.step = a.step + 1 WHERE a.step <= 5) SELECT from_page, to_page, SUM(cnt) AS transitions FROM pairs GROUP BY 1, 2 ORDER BY transitions DESC LIMIT 30

PATTERN 2 — Traffic source → Landing page → Second page (3-layer):
  WITH ordered AS (SELECT ga_session_id, COALESCE(session_source, '(direct)') AS source, COALESCE(session_medium, '(none)') AS medium, REGEXP_EXTRACT(page_location, r'https?://[^/]+(/[^?]*)') AS page_path, ROW_NUMBER() OVER (PARTITION BY ga_session_id ORDER BY event_timestamp) AS step FROM \`{dataset}.pageviews\` WHERE event_date >= @startDate AND page_location IS NOT NULL), first_page AS (SELECT ga_session_id, source, medium, page_path AS landing_page FROM ordered WHERE step = 1), second_page AS (SELECT ga_session_id, page_path AS second_page FROM ordered WHERE step = 2), layer1 AS (SELECT CONCAT(source, ' / ', medium) AS from_node, CONCAT('Page 1: ', landing_page) AS to_node, COUNT(*) AS transitions FROM first_page GROUP BY 1, 2), layer2 AS (SELECT CONCAT('Page 1: ', f.landing_page) AS from_node, CONCAT('Page 2: ', s.second_page) AS to_node, COUNT(*) AS transitions FROM first_page f JOIN second_page s ON f.ga_session_id = s.ga_session_id GROUP BY 1, 2) SELECT * FROM layer1 UNION ALL SELECT * FROM layer2 ORDER BY transitions DESC LIMIT 30
Use Pattern 2 when the user asks about traffic sources/channels flowing into pages, or asks for a multi-layer sankey showing where users came from. Use Pattern 1 for general page-to-page step flows.

After getting the query results, you MUST render a sankey chart using [[chart]]...[[/chart]] with ECharts type "sankey". Build the nodes array from all unique from_node and to_node values, and the links array from each row {source: from_node, target: to_node, value: transitions}. Do NOT output a table — always render as a sankey chart.

SANKEY COVERAGE NOTE: Sankey diagrams only include sessions with 2+ pageviews — single-page (bounce) sessions have no page-to-page flow to show. The LIMIT 30 also trims less common paths. So the total sessions in a sankey will always be LESS than total sessions in a scorecard. After rendering the sankey, briefly mention how many sessions the sankey covers vs total (e.g. "This sankey covers X sessions out of Y total — the remaining Z were single-page visits").

Always clean URLs with REGEXP_EXTRACT to strip query params and domain. Limit results to keep diagrams readable.

IMPORTANT: Data is exported from GA4 daily and may be up to 24 hours behind. Today's data is typically not available until tomorrow. When users ask about "today", inform them of this lag and show yesterday's data instead. When asked about "this week", use a date range starting from the Monday of the current week.

NEVER GUESS DATA BOUNDARIES: If a query returns fewer rows than expected or the user questions why data seems incomplete, DO NOT guess or assume a cutoff date. Instead, run a verification query like: SELECT MIN(session_date) AS earliest, MAX(session_date) AS latest, COUNT(*) AS total FROM {dataset}.sessions — then report the actual boundaries from the query result.

${SHARED_PROMPT_OUTPUT}`;
}

// ---------------------------------------------------------------------------
// BigQuery SQL builder from structured tool input
// ---------------------------------------------------------------------------

interface QueryAnalyticsInput {
  table: string;
  metrics: string[];
  dimensions?: string[];
  startDate?: string;
  endDate?: string;
  filters?: { field: string; operator: string; value: unknown }[];
  orderBy?: { field: string; direction?: string };
  limit?: number;
}

function buildAnalyticsSQL(input: QueryAnalyticsInput): { sql: string; params: Record<string, unknown> } {
  const { table, metrics, dimensions, startDate, endDate, filters, orderBy, limit } = input;

  // Build SELECT clause
  const selectParts: string[] = [];
  if (dimensions) selectParts.push(...dimensions);

  for (const metric of metrics) {
    // Map common metric names to SQL aggregations
    switch (metric) {
      case "sessions":
        selectParts.push(table === "traffic_sources" ? "SUM(sessions) AS sessions" : "COUNT(*) AS sessions");
        break;
      case "users":
        selectParts.push(table === "traffic_sources" ? "SUM(users) AS users" : "COUNT(DISTINCT user_pseudo_id) AS users");
        break;
      case "pageviews":
        selectParts.push(table === "traffic_sources" ? "SUM(pageviews) AS pageviews" : "SUM(pageviews) AS pageviews");
        break;
      case "bounce_rate":
        selectParts.push(table === "traffic_sources" ? "AVG(bounce_rate) AS bounce_rate" : "AVG(CASE WHEN is_bounce THEN 1.0 ELSE 0.0 END) AS bounce_rate");
        break;
      case "avg_session_duration":
        selectParts.push(table === "traffic_sources" ? "AVG(avg_session_duration_seconds) AS avg_session_duration" : "AVG(session_duration_seconds) AS avg_session_duration");
        break;
      case "new_users":
        if (table === "traffic_sources") {
          selectParts.push("SUM(new_users) AS new_users");
        } else {
          selectParts.push("COUNTIF(is_first_visit) AS new_users");
        }
        break;
      case "event_count": selectParts.push("COUNT(*) AS event_count"); break;
      // Google Ads metrics
      case "impressions": selectParts.push("SUM(impressions) AS impressions"); break;
      case "clicks": selectParts.push("SUM(clicks) AS clicks"); break;
      case "cost": selectParts.push("SUM(cost) AS cost"); break;
      case "conversions": {
        const isAds = ["campaign_performance", "keyword_performance", "click_attribution", "account_info"].includes(table);
        selectParts.push(isAds ? "SUM(conversions) AS conversions" : "COUNT(*) AS conversions");
        break;
      }
      case "conversions_value": selectParts.push("SUM(conversions_value) AS conversions_value"); break;
      case "ctr": selectParts.push("SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr"); break;
      case "cpc": selectParts.push("SAFE_DIVIDE(SUM(cost), SUM(clicks)) AS cpc"); break;
      case "cpa": selectParts.push("SAFE_DIVIDE(SUM(cost), SUM(conversions)) AS cpa"); break;
      case "roas": selectParts.push("SAFE_DIVIDE(SUM(conversions_value), SUM(cost)) AS roas"); break;
      case "attributed_sessions": selectParts.push("SUM(attributed_sessions) AS attributed_sessions"); break;
      case "attributed_users": selectParts.push("SUM(attributed_users) AS attributed_users"); break;
      case "ads_cost": selectParts.push("SUM(ads_cost) AS ads_cost"); break;
      case "ads_roas": selectParts.push("SAFE_DIVIDE(SUM(ads_conversions_value), SUM(ads_cost)) AS ads_roas"); break;
      case "cost_per_attributed_session": selectParts.push("SAFE_DIVIDE(SUM(ads_cost), SUM(attributed_sessions)) AS cost_per_attributed_session"); break;
      default: {
        // Handle when Claude passes raw SQL like "SUM(cost)" or "SUM(cost) as total_cost"
        // Extract alias if present, otherwise derive one from the expression
        const aliasMatch = metric.match(/\bas\s+(\w+)\s*$/i);
        if (aliasMatch) {
          // Already has an alias: "SUM(cost) as total_cost"
          selectParts.push(metric);
        } else if (table === "traffic_sources") {
          selectParts.push(`SUM(${metric}) AS ${metric}`);
        } else {
          // Add a sensible alias for raw expressions like "SUM(cost)" -> "cost"
          const innerMatch = metric.match(/^\w+\((\w+)\)$/);
          if (innerMatch) {
            selectParts.push(`${metric} AS ${innerMatch[1]}`);
          } else {
            selectParts.push(metric);
          }
        }
      }
    }
  }

  // Build a map of known aliases from the SELECT parts for orderBy resolution
  const aliasSet = new Set<string>();
  for (const part of selectParts) {
    const m = part.match(/\bAS\s+(\w+)\s*$/i);
    if (m) aliasSet.add(m[1]);
  }

  const selectClause = selectParts.join(", ");

  // Build WHERE clause
  const whereParts: string[] = [];
  const params: Record<string, unknown> = {};

  // Date filtering
  const isAdsTable = ["campaign_performance", "keyword_performance", "click_attribution", "account_info"].includes(table);
  const isAccountInfo = table === "account_info" || table === "site_info";
  const dateColumn =
    table === "traffic_sources" || table === "sessions" ? "session_date" :
    table === "campaign_performance" || table === "keyword_performance" ? "stats_date" :
    table === "click_attribution" ? "click_date" :
    table === "search_performance" ? "query_date" :
    table === "pageviews" || table === "conversions" || table === "stg_events" ? "event_date" :
    table === "users" ? "DATE(last_seen)" : "event_date";

  // account_info has no date column
  if (!isAccountInfo) {
    if (startDate) {
      whereParts.push(`${dateColumn} >= @startDate`);
      params.startDate = startDate;
    } else {
      whereParts.push(`${dateColumn} >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)`);
    }
    if (endDate) {
      whereParts.push(`${dateColumn} <= @endDate`);
      params.endDate = endDate;
    }
  }

  // Custom filters
  if (filters) {
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i];
      if (f.operator === "IN" || f.operator === "NOT IN") {
        whereParts.push(`${f.field} ${f.operator} UNNEST(@filter_${i})`);
      } else if (f.operator === "LIKE") {
        whereParts.push(`${f.field} LIKE @filter_${i}`);
      } else {
        whereParts.push(`${f.field} ${f.operator} @filter_${i}`);
      }
      params[`filter_${i}`] = f.value;
    }
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
  const groupByClause = dimensions && dimensions.length > 0 ? `GROUP BY ${dimensions.join(", ")}` : "";
  const rawDir = (orderBy?.direction || "DESC").toUpperCase();
  const dir = rawDir.startsWith("ASC") ? "ASC" : "DESC";
  // Normalize orderBy field: if Claude passes "SUM(cost)", resolve to the alias "cost"
  let orderField = orderBy?.field;
  if (orderField && !aliasSet.has(orderField)) {
    // Try to find the alias for this expression (e.g. "SUM(cost)" -> "cost")
    const innerMatch = orderField.match(/^\w+\((\w+)\)$/);
    if (innerMatch && aliasSet.has(innerMatch[1])) {
      orderField = innerMatch[1];
    }
  }
  const orderByClause = orderBy ? `ORDER BY ${orderField} ${dir}` : "";
  // Use a higher default when grouping by date so time-series queries return all rows
  const hasDimDate = dimensions?.some((d) => d === "date" || d === "session_date" || d === "event_date" || d === "stats_date" || d === "click_date" || d === "query_date");
  const defaultLimit = hasDimDate ? 90 : 25;
  const limitClause = `LIMIT ${Math.min(limit || defaultLimit, 500)}`;

  const sql = `SELECT ${selectClause} FROM \`{dataset}.${table}\` ${whereClause} ${groupByClause} ${orderByClause} ${limitClause}`;

  return { sql, params };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

// getUsesBigQuery moved to src/lib/rollout.ts as shouldUseBigQuery

export async function POST(request: NextRequest) {
  const session = await auth();
  const accessToken = await getGoogleAccessToken(
    session as { accessToken?: string; userId?: string; teamAdminId?: string } | null
  );

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check subscription — team members use the admin's subscription
  const userId = (session as { userId?: string })?.userId;
  const teamAdminId = (session as { teamAdminId?: string })?.teamAdminId;
  const subscriptionOwnerId = teamAdminId || userId;
  if (subscriptionOwnerId) {
    const active = await hasActiveSubscription(subscriptionOwnerId);
    if (!active) {
      return NextResponse.json(
        { error: "Active subscription required", code: "SUBSCRIPTION_REQUIRED" },
        { status: 403 }
      );
    }
  }

  const body = (await request.json()) as {
    messages: ChatMessage[];
    propertyId?: string;
    orgId?: string;
  };
  const { messages } = body;

  // Resolve propertyId: prefer orgId (new path), fall back to propertyId (backward compat)
  let propertyId = body.propertyId ?? "";
  let adsCustomerIdFromOrg: string | null = null;
  let linkedInOrgIdFromOrg: string | null = null;
  let mailchimpListIdFromOrg: string | null = null;
  let gscSiteUrlFromOrg: string | null = null;
  let msAdsAccountIdFromOrg: string | null = null;
  let displayCurrency = "USD";

  if (body.orgId) {
    // Fetch org settings (including display currency)
    const org = await prisma.organization.findUnique({
      where: { id: body.orgId },
      select: { displayCurrency: true },
    });
    displayCurrency = org?.displayCurrency ?? "USD";

    // Org-based: fetch all org data sources and pick the first GA4 property
    const orgDataSources = await getOrgDataSources(body.orgId);
    // Include ERROR status — data still exists in BigQuery even if the last sync failed
    const connectedStatuses = ["ACTIVE", "BACKFILLING", "ERROR"];
    const ga4Ds = orgDataSources.find((ds) => ds.type === "GA4_BIGQUERY" && connectedStatuses.includes(ds.status));
    if (ga4Ds) {
      propertyId = ga4Ds.propertyId;
    }
    const adsDsList = orgDataSources.filter((ds) => ds.type === "GOOGLE_ADS" && connectedStatuses.includes(ds.status));
    if (adsDsList.length > 0) {
      adsCustomerIdFromOrg = adsDsList[0].adsCustomerId ?? null;
    }
    const linkedInDsList = orgDataSources.filter((ds) => ds.type === "LINKEDIN" && connectedStatuses.includes(ds.status));
    if (linkedInDsList.length > 0) {
      linkedInOrgIdFromOrg = linkedInDsList[0].propertyId;
    }
    const mailchimpDsList = orgDataSources.filter((ds) => ds.type === "MAILCHIMP" && connectedStatuses.includes(ds.status));
    if (mailchimpDsList.length > 0) {
      mailchimpListIdFromOrg = mailchimpDsList[0].propertyId;
    }
    const gscDsList = orgDataSources.filter((ds) => ds.type === "SEARCH_CONSOLE" && connectedStatuses.includes(ds.status));
    if (gscDsList.length > 0) {
      gscSiteUrlFromOrg = gscDsList[0].propertyId;
    }
    const msAdsDsList = orgDataSources.filter((ds) => ds.type === "MICROSOFT_ADS" && connectedStatuses.includes(ds.status));
    if (msAdsDsList.length > 0) {
      msAdsAccountIdFromOrg = msAdsDsList[0].propertyId;
    }
  }

  if (!propertyId && !body.orgId) {
    return NextResponse.json(
      { error: "No GA4 property or account selected" },
      { status: 400 }
    );
  }

  // Validate property access for team members (legacy path only)
  if (userId && !body.orgId && propertyId) {
    const allowed = await getAllowedPropertyIds(userId);
    if (allowed !== "all" && !allowed.includes(propertyId)) {
      return NextResponse.json(
        { error: "You don't have access to this property" },
        { status: 403 }
      );
    }
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: "No messages provided" },
      { status: 400 }
    );
  }

  // Determine data path: BigQuery or GA4
  const rollout = userId && propertyId ? await shouldUseBigQuery(propertyId, userId) : { useBigQuery: !!body.orgId, reason: body.orgId ? "org_mode" : "no_user" };
  const usesBigQuery = rollout.useBigQuery;
  const adsCustomerId = body.orgId ? adsCustomerIdFromOrg : (usesBigQuery && userId ? await getGoogleAdsCustomerId(userId, propertyId) : null);
  const linkedInOrgId = body.orgId ? linkedInOrgIdFromOrg : (usesBigQuery && userId ? await getLinkedInOrgId(userId, propertyId) : null);
  const mailchimpListId = body.orgId ? mailchimpListIdFromOrg : (usesBigQuery && userId ? await getMailchimpListId(userId, propertyId) : null);
  const gscSiteUrl = body.orgId ? gscSiteUrlFromOrg : (usesBigQuery && userId ? await getGscSiteUrl(userId, propertyId) : null);
  const msAdsAccountId = body.orgId ? msAdsAccountIdFromOrg : (usesBigQuery && userId ? await getMicrosoftAdsAccountId(userId, propertyId) : null);
  const hasAds = !!adsCustomerId;
  const hasLinkedIn = !!linkedInOrgId;
  const hasMailchimp = !!mailchimpListId;
  const hasGsc = !!gscSiteUrl;
  const hasMsAds = !!msAdsAccountId;
  console.log(`[chat] property=${propertyId} user=${userId} path=${usesBigQuery ? "bigquery" : "ga4"} ads=${hasAds} msads=${hasMsAds} linkedin=${hasLinkedIn} mailchimp=${hasMailchimp} gsc=${hasGsc} currency=${displayCurrency} reason=${rollout.reason}`);
  const systemPrompt = usesBigQuery ? getBigQuerySystemPrompt(hasAds, hasLinkedIn, hasMailchimp, hasGsc, hasMsAds, displayCurrency) : GA4_SYSTEM_PROMPT;
  const tools = usesBigQuery ? BIGQUERY_TOOLS : GA4_TOOLS;

  // Helper: describe a tool call for the progress stream
  function describeToolCall(name: string, input: Record<string, unknown>): string {
    switch (name) {
      case "query_analytics": {
        const t = (input.table as string) || "data";
        const m = (input.metrics as string[])?.join(", ") || "";
        return `Querying ${t}${m ? ` for ${m}` : ""}`;
      }
      case "run_ads_query":
        return (input.description as string) || "Running Ads query";
      case "run_linkedin_query":
        return (input.description as string) || "Querying LinkedIn data";
      case "run_mailchimp_query":
        return (input.description as string) || "Querying Mailchimp data";
      case "run_gsc_query":
        return (input.description as string) || "Querying Search Console data";
      case "run_microsoft_ads_query":
        return (input.description as string) || "Querying Microsoft Ads data";
      case "run_report":
        return `Querying GA4 report`;
      case "run_realtime_report":
        return "Checking realtime data";
      case "get_realtime_data":
        return "Checking realtime data";
      case "get_available_fields":
      case "get_metadata":
        return "Loading available fields";
      default:
        return `Running ${name}`;
    }
  }

  // Stream NDJSON: each line is a JSON object with { type, ... }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        // Convert chat messages to Anthropic format
        const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        send({ type: "status", message: "Thinking..." });

        // Run the agentic loop: Claude may call tools multiple times
        let response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          tools,
          messages: anthropicMessages,
        });

        // Accumulate conversation history across tool rounds so Claude sees ALL prior results
        const conversationMessages: Anthropic.MessageParam[] = [...anthropicMessages];

        // Agentic tool-use loop (max 4 rounds to prevent runaway credit burn)
        let toolRound = 0;
        const MAX_TOOL_ROUNDS = 4;
        while (response.stop_reason === "tool_use" && toolRound < MAX_TOOL_ROUNDS) {
          toolRound++;
          const assistantContent = response.content;
          const toolUseBlocks = assistantContent.filter(
            (block): block is Anthropic.ContentBlockParam & { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
              block.type === "tool_use"
          );

          // Send status for each tool call
          for (const toolUse of toolUseBlocks) {
            send({ type: "status", message: describeToolCall(toolUse.name, toolUse.input) });
          }

          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const toolUse of toolUseBlocks) {
            let result: unknown;
            let isError = false;

            try {
              if (usesBigQuery) {
                // BigQuery tool execution
                switch (toolUse.name) {
                  case "query_analytics": {
                    const input = toolUse.input as unknown as QueryAnalyticsInput;
                    const { sql, params } = buildAnalyticsSQL(input);
                    console.log("[BigQuery] Tool input:", JSON.stringify(input));
                    console.log("[BigQuery] Generated SQL:", sql);
                    result = await runPropertyQuery(propertyId, sql, params, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId);
                    break;
                  }
                  case "run_ads_query": {
                    const input = toolUse.input as { sql: string; description?: string };
                    console.log("[BigQuery] Ads query:", input.description || "custom");
                    console.log("[BigQuery] Raw SQL:", input.sql);
                    result = await runPropertyQuery(propertyId, input.sql, undefined, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId);
                    break;
                  }
                  case "run_linkedin_query": {
                    const input = toolUse.input as { sql: string; description?: string };
                    console.log("[BigQuery] LinkedIn query:", input.description || "custom");
                    console.log("[BigQuery] Raw SQL:", input.sql);
                    result = await runPropertyQuery(propertyId, input.sql, undefined, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId);
                    break;
                  }
                  case "run_mailchimp_query": {
                    const input = toolUse.input as { sql: string; description?: string };
                    console.log("[BigQuery] Mailchimp query:", input.description || "custom");
                    console.log("[BigQuery] Raw SQL:", input.sql);
                    result = await runPropertyQuery(propertyId, input.sql, undefined, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId);
                    break;
                  }
                  case "run_gsc_query": {
                    const input = toolUse.input as { sql: string; description?: string };
                    console.log("[BigQuery] GSC query:", input.description || "custom");
                    console.log("[BigQuery] Raw SQL:", input.sql);
                    result = await runPropertyQuery(propertyId, input.sql, undefined, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId);
                    break;
                  }
                  case "run_microsoft_ads_query": {
                    const input = toolUse.input as { sql: string; description?: string };
                    console.log("[BigQuery] Microsoft Ads query:", input.description || "custom");
                    console.log("[BigQuery] Raw SQL:", input.sql);
                    result = await runPropertyQuery(propertyId, input.sql, undefined, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId);
                    break;
                  }
                  case "get_realtime_data": {
                    result = await queryRealtimeData(propertyId);
                    break;
                  }
                  case "get_available_fields": {
                    result = await getPropertySchema(propertyId);
                    break;
                  }
                  default:
                    result = { error: `Unknown tool: ${toolUse.name}` };
                    isError = true;
                }
              } else {
                // GA4 tool execution (legacy)
                switch (toolUse.name) {
                  case "run_report": {
                    const input = toolUse.input as {
                      metrics: string[];
                      dimensions?: string[];
                      startDate?: string;
                      endDate?: string;
                      limit?: number;
                      orderBys?: { field: string; direction?: "ASCENDING" | "DESCENDING"; type?: "metric" | "dimension" }[];
                    };
                    result = await runReport(accessToken, {
                      propertyId,
                      metrics: input.metrics,
                      dimensions: input.dimensions,
                      startDate: input.startDate,
                      endDate: input.endDate,
                      limit: Math.min(input.limit || 10, 100),
                      orderBys: input.orderBys,
                    });
                    break;
                  }
                  case "run_realtime_report": {
                    const input = toolUse.input as {
                      metrics: string[];
                      dimensions?: string[];
                      limit?: number;
                    };
                    result = await runRealtimeReport(accessToken, {
                      propertyId,
                      metrics: input.metrics,
                      dimensions: input.dimensions,
                      limit: Math.min(input.limit || 10, 100),
                    });
                    break;
                  }
                  case "get_metadata": {
                    const input = toolUse.input as { type?: string };
                    const metadata = await getMetadata(
                      accessToken,
                      propertyId
                    );
                    if (input.type === "metrics") {
                      result = { metrics: metadata.metrics };
                    } else if (input.type === "dimensions") {
                      result = { dimensions: metadata.dimensions };
                    } else {
                      result = metadata;
                    }
                    break;
                  }
                  default:
                    result = { error: `Unknown tool: ${toolUse.name}` };
                    isError = true;
                }
              }
            } catch (error: unknown) {
              const errMsg =
                error instanceof Error
                  ? error.message
                  : "Tool execution failed";
              result = { error: errMsg };
              isError = true;
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: JSON.stringify(result),
              is_error: isError,
            });
          }

          send({ type: "status", message: "Analysing results..." });

          // Append this round's exchange to the accumulated conversation
          conversationMessages.push({ role: "assistant", content: assistantContent });
          conversationMessages.push({ role: "user", content: toolResults });

          // Continue the conversation with full history
          response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            tools,
            messages: conversationMessages,
          });
        }

        // If the loop ended because of max rounds but Claude still wants tools,
        // make one final call WITHOUT tools to force a text response.
        if (response.stop_reason === "tool_use") {
          console.log("[chat] Max tool rounds reached — forcing final text response");
          send({ type: "status", message: "Summarising..." });
          const assistantContent = response.content;
          const toolUseBlocks = assistantContent.filter(
            (block): block is Anthropic.ContentBlockParam & { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
              block.type === "tool_use"
          );
          const emptyResults = toolUseBlocks.map((t) => ({
            type: "tool_result" as const,
            tool_use_id: t.id,
            content: JSON.stringify({ error: "Tool limit reached. Answer the user's question using the data from your previous successful queries." }),
            is_error: true,
          }));
          conversationMessages.push({ role: "assistant", content: assistantContent });
          conversationMessages.push({ role: "user", content: emptyResults });
          response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            messages: conversationMessages,
          });
        }

        // Extract the final text response
        const textBlocks = response.content.filter(
          (block): block is Anthropic.TextBlock => block.type === "text"
        );
        let rawMessage = textBlocks.map((b) => b.text).join("\n");
        console.log("[chat] rawMessage length:", rawMessage.length, "textBlocks:", textBlocks.length, "stop_reason:", response.stop_reason);

        // Parse scorecard block at start (for "how many...?" style questions)
        const scorecard = parseScorecard(rawMessage);
        if (scorecard) {
          rawMessage = stripScorecardBlock(rawMessage);
        }

        // Parse chart block
        const chart = parseChart(rawMessage);
        if (chart) {
          rawMessage = stripChartBlock(rawMessage);
        }

        // Parse suggested follow-up questions from JSON block at end
        const suggestedQuestions = parseSuggestedQuestions(rawMessage);
        if (suggestedQuestions) {
          rawMessage = stripSuggestedQuestionsBlock(rawMessage);
        }

        send({
          type: "result",
          message: rawMessage.trim(),
          scorecard: scorecard ?? undefined,
          chart: chart ?? undefined,
          suggestedQuestions: suggestedQuestions ?? undefined,
          _dataPath: usesBigQuery ? "bigquery" : "ga4",
          _rolloutReason: rollout.reason,
        });

        controller.close();
      } catch (error: unknown) {
        console.error("Chat API error:", error);
        const errMsg =
          error instanceof Error ? error.message : "Chat request failed";
        send({ type: "error", error: errMsg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
