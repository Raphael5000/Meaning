import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runPropertyQuery, queryRealtimeData, getPropertySchema } from "@/lib/bigquery";
import { BIGQUERY_TOOLS } from "@/lib/tools";
import { getOrgDataSources } from "@/lib/org-access";
import { getSourceCurrencies } from "@/lib/currency";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ timeout: 60_000 }); // 60s timeout per API call

// ---------------------------------------------------------------------------
// Reuse the same SQL builder from the chat route
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

  const selectParts: string[] = [];
  if (dimensions) selectParts.push(...dimensions);

  for (const metric of metrics) {
    switch (metric) {
      case "sessions": selectParts.push(table === "traffic_sources" ? "SUM(sessions) AS sessions" : "COUNT(*) AS sessions"); break;
      case "users": selectParts.push(table === "traffic_sources" ? "SUM(users) AS users" : "COUNT(DISTINCT user_pseudo_id) AS users"); break;
      case "pageviews": selectParts.push("SUM(pageviews) AS pageviews"); break;
      case "bounce_rate": selectParts.push(table === "traffic_sources" ? "AVG(bounce_rate) AS bounce_rate" : "AVG(CASE WHEN is_bounce THEN 1.0 ELSE 0.0 END) AS bounce_rate"); break;
      case "avg_session_duration": selectParts.push(table === "traffic_sources" ? "AVG(avg_session_duration_seconds) AS avg_session_duration" : "AVG(session_duration_seconds) AS avg_session_duration"); break;
      case "new_users": selectParts.push(table === "traffic_sources" ? "SUM(new_users) AS new_users" : "COUNTIF(is_first_visit) AS new_users"); break;
      case "event_count": selectParts.push("COUNT(*) AS event_count"); break;
      case "impressions": selectParts.push("SUM(impressions) AS impressions"); break;
      case "clicks": selectParts.push("SUM(clicks) AS clicks"); break;
      case "cost": selectParts.push("SUM(cost) AS cost"); break;
      case "conversions": {
        const isAds = ["campaign_performance", "keyword_performance"].includes(table);
        selectParts.push(isAds ? "SUM(conversions) AS conversions" : "COUNT(*) AS conversions");
        break;
      }
      case "conversions_value": selectParts.push("SUM(conversions_value) AS conversions_value"); break;
      case "ctr": selectParts.push("SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr"); break;
      case "cpc": selectParts.push("SAFE_DIVIDE(SUM(cost), SUM(clicks)) AS cpc"); break;
      case "roas": selectParts.push("SAFE_DIVIDE(SUM(conversions_value), SUM(cost)) AS roas"); break;
      default: {
        const aliasMatch = metric.match(/\bas\s+(\w+)\s*$/i);
        if (aliasMatch) {
          selectParts.push(metric);
        } else {
          const innerMatch = metric.match(/^\w+\((\w+)\)$/);
          if (innerMatch) selectParts.push(`${metric} AS ${innerMatch[1]}`);
          else selectParts.push(metric);
        }
      }
    }
  }

  const aliasSet = new Set<string>();
  for (const part of selectParts) {
    const m = part.match(/\bAS\s+(\w+)\s*$/i);
    if (m) aliasSet.add(m[1]);
  }

  const selectClause = selectParts.join(", ");
  const whereParts: string[] = [];
  const params: Record<string, unknown> = {};

  const isAccountInfo = table === "account_info" || table === "site_info";
  const dateColumn =
    table === "traffic_sources" || table === "sessions" ? "session_date" :
    table === "campaign_performance" || table === "keyword_performance" ? "stats_date" :
    table === "click_attribution" ? "click_date" :
    table === "search_performance" ? "query_date" :
    table === "pageviews" || table === "conversions" || table === "stg_events" ? "event_date" :
    table === "users" ? "DATE(last_seen)" : "event_date";

  if (!isAccountInfo) {
    if (startDate) { whereParts.push(`${dateColumn} >= @startDate`); params.startDate = startDate; }
    else { whereParts.push(`${dateColumn} >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)`); }
    if (endDate) { whereParts.push(`${dateColumn} <= @endDate`); params.endDate = endDate; }
  }

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
  let orderField = orderBy?.field;
  if (orderField && !aliasSet.has(orderField)) {
    const innerMatch = orderField.match(/^\w+\((\w+)\)$/);
    if (innerMatch && aliasSet.has(innerMatch[1])) orderField = innerMatch[1];
  }
  const orderByClause = orderBy ? `ORDER BY ${orderField} ${dir}` : "";
  const limitClause = `LIMIT ${Math.min(limit || 10, 500)}`;

  const sql = `SELECT ${selectClause} FROM \`{dataset}.${table}\` ${whereClause} ${groupByClause} ${orderByClause} ${limitClause}`;
  return { sql, params };
}

// ---------------------------------------------------------------------------
// Widget system prompt (shorter, focused on single-widget generation)
// ---------------------------------------------------------------------------

function getWidgetSystemPrompt(hasAds: boolean, hasLinkedIn: boolean, hasMailchimp: boolean, hasGsc: boolean, hasMsAds: boolean, hasAhrefs: boolean, displayCurrency = "USD", sourceCurrencies: Record<string, string> = {}): string {
  const today = new Date().toISOString().split("T")[0];

  const currencySymbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", ZAR: "R", AUD: "A$", CAD: "C$", JPY: "¥",
    CHF: "CHF", INR: "₹", BRL: "R$", NZD: "NZ$", SEK: "kr", NOK: "kr",
    MXN: "$", SGD: "S$", HKD: "HK$", KRW: "₩", TRY: "₺", ILS: "₪",
    AED: "AED", NGN: "₦", PHP: "₱", THB: "฿", CNY: "¥",
  };
  const symbol = currencySymbols[displayCurrency] || displayCurrency;

  const adsTables = hasAds ? "\n  - campaign_performance: stats_date, campaign_id, campaign_name, campaign_status, impressions, clicks, cost, conversions, conversions_value (Google Ads — ALWAYS use 'cost' column, NOT 'cost_micros')\n  - keyword_performance: stats_date, campaign_id, campaign_name, ad_group_id, ad_group_name, keyword_text, match_type, impressions, clicks, cost, conversions (Google Ads)\n  - click_attribution, account_info (Google Ads)" : "";
  const linkedInTables = hasLinkedIn ? "\n  - post_performance, follower_stats, follower_demographics, page_stats, org_info (LinkedIn)" : "";
  const mailchimpTables = hasMailchimp ? "\n  - campaign_reports, audience_stats, audience_growth, mc_account_info (Mailchimp)" : "";
  const gscTables = hasGsc ? "\n  - search_performance, url_inspection, site_info (Google Search Console)" : "";
  const msAdsTables = hasMsAds ? "\n  - msads_campaign_performance, msads_keyword_performance, msads_search_query_performance, msads_account_info (Microsoft/Bing Ads — use run_microsoft_ads_query tool)" : "";
  const ahrefsTables = hasAhrefs ? "\n  - ahrefs_site_metrics: snapshot_date, org_keywords, org_traffic, org_cost, paid_keywords, paid_traffic (Ahrefs — use run_ahrefs_query tool)\n  - ahrefs_domain_rating: snapshot_date, domain_rating (0-100), ahrefs_rank\n  - ahrefs_backlinks_stats: snapshot_date, live_backlinks, all_time_backlinks, live_refdomains, all_time_refdomains\n  - ahrefs_organic_keywords: snapshot_date, keyword, best_position, volume, sum_traffic, cpc, keyword_difficulty (0-100), best_position_url\n  - ahrefs_top_pages: snapshot_date, url, keywords, sum_traffic, value, top_keyword, top_keyword_best_position, ur\n  - ahrefs_referring_domains: snapshot_date, domain, domain_rating, dofollow_links, links_to_target, traffic_domain\n  - ahrefs_site_info: target_domain, country, last_synced_at" : "";

  return `You are a data visualization assistant. Your job is to generate a single dashboard widget from a user's natural language request.

Today's date is ${today}.

CRITICAL RULES:
1. THINK before querying. Interpret the user's intent — e.g. "top blog posts" means filter for pages with /blog/ in the URL path, "landing pages" means the first page in a session, "product pages" means pages with /product/ in the path. Use your knowledge of common website URL patterns to build smart filters.
2. Be FAST — minimize tool calls. All table schemas are listed below so DO NOT call get_available_fields. Most widgets need just 1 query. For scorecards with comparison, use 1 query with a CASE expression or UNION instead of 2 separate queries. When combining BigQuery data with manual metrics, you may need multiple tool calls — that's fine. Maximum 5 tool rounds.
3. For filtering by page type (blog, product, etc.), use LIKE filters on page_location: WHERE page_location LIKE '%/blog/%' for blog posts. Always use the path pattern, not page_title.
4. NEVER fabricate data. Only use numbers from the tool response.
5. Default date range is last 28 days unless specified.
6. Use the run_ads_query tool for any query that needs LIKE filters, JOINs, subqueries, or complex SQL — query_analytics is only for simple aggregations.
7. MANDATORY: When querying ANY monetary values (cost, spend, revenue, conversions_value), you MUST use the exchange rate conversion pattern to convert to ${displayCurrency}. Do NOT just query raw cost — always JOIN with exchange_rates. See CURRENCY section below.
8. ALL monetary values in SQL must be ROUND(..., 2) to 2 decimal places. Always include 2 decimal places in scorecard values (e.g. "R12,599.33" not "R12,599").
9. DATE PARAMETERS (MANDATORY): For ALL raw SQL queries (run_ads_query, run_gsc_query, run_linkedin_query, run_mailchimp_query, run_microsoft_ads_query), you MUST use @startDate and @endDate parameters instead of hardcoded dates. Example: WHERE stats_date >= @startDate AND stats_date <= @endDate. This allows the dashboard date range picker to update the widget without regenerating it. For scorecards with previous period comparison, compute the previous period relative to @startDate and @endDate: previous_start = DATE_SUB(@startDate, INTERVAL DATE_DIFF(@endDate, @startDate, DAY) DAY).
10. TIME SERIES COMPLETENESS (MANDATORY): For ANY line or bar chart showing data over time (daily, weekly, monthly), you MUST use GENERATE_DATE_ARRAY to produce every date in the range, then LEFT JOIN your data onto it. This ensures days/weeks/months with zero values still appear on the x-axis. Example pattern:
    WITH dates AS (SELECT d FROM UNNEST(GENERATE_DATE_ARRAY(@startDate, @endDate)) AS d)
    SELECT dates.d AS date, COALESCE(SUM(metric), 0) AS metric
    FROM dates LEFT JOIN table ON table.date_col = dates.d
    GROUP BY dates.d ORDER BY dates.d
    For weekly: GENERATE_DATE_ARRAY(@startDate, @endDate, INTERVAL 7 DAY).
    For monthly: use DATE_TRUNC on dates.d and GROUP BY the truncated month.
    NEVER skip this — gaps in time series charts are unacceptable.
11. SANKEY LIMITS: Limit sankey queries to 20 rows (LIMIT 20, not 30). Keep node names short — truncate URLs to the path only (strip domain). Use at most 2 layers (source→page or page→page).

Available tables and their columns:
  - sessions: session_date, user_pseudo_id, ga_session_id, session_duration_seconds, pageviews, is_bounce, landing_page, exit_page, session_source, session_medium, session_default_channel_group, device_category, geo_country, geo_city, is_first_visit
  - pageviews: event_date, user_pseudo_id, ga_session_id, event_timestamp, page_location, page_title, session_source, session_medium, device_category, geo_country
  - users: first_seen, last_seen, total_sessions, total_pageviews, acquisition_source, acquisition_medium, device_category, geo_country, is_new_user
  - traffic_sources: session_date, source, medium, channel_group, sessions, users, new_users, pageviews, bounce_rate
  - conversions: event_date, event_name, page_location, session_source, session_medium, geo_country
  - stg_events: event_date, event_timestamp, event_name, user_pseudo_id, ga_session_id, page_location, session_source, session_medium${adsTables}${msAdsTables}${linkedInTables}${mailchimpTables}${gscTables}${ahrefsTables}

IMPORTANT column notes:
- traffic_sources uses "source" and "medium". sessions/pageviews use "session_source" and "session_medium". Do NOT mix them.
- For page flow / sankey diagrams, use pageviews table with page_location, ga_session_id, event_timestamp, session_source, session_medium. Sankey nodes MUST be unique — prefix each layer (e.g. "google / organic" for sources, "Page 1: /path" for landing pages, "Page 2: /path" for second pages). For source→page flows, UNION two layers: source→landing page and landing page→second page. Columns must be from_node, to_node, transitions. NOTE: Sankeys only cover sessions with 2+ pageviews (bounces excluded) and LIMIT 30 trims rare paths, so totals will be less than a session scorecard.
- For Google Ads: date column is stats_date. cost is already in currency units.
- For LinkedIn: post_performance has ONE ROW PER POST: published_date, post_urn, post_type, text_preview, impressions, unique_impressions, clicks, comments, likes, shares, engagements, created_at. For total impressions: SUM(impressions). For post count: COUNT(*). Filter by published_date for time periods. follower_stats.total_followers is cumulative — use latest row for current count. page_stats columns: stats_date, page_views, unique_visitors, clicks (cumulative lifetime snapshots).
- For Mailchimp: date column is send_date or stats_date.
- For GSC: date column is query_date. ctr is 0-1 decimal. position: lower is better. IMPORTANT: BigQuery uses INTERVAL N DAY (singular, not DAYS). Always write DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY), never DAYS/MONTHS.
- GA4 vs GSC DATA: GA4 sessions with source='google' includes ALL Google traffic (organic, paid/cpc, referral from YouTube/Gmail, Discover). GSC clicks only counts organic search clicks. These numbers will NOT match. When showing organic search traffic from GA4, always filter by session_source='google' AND session_medium='organic'. When comparing GA4 and GSC, explain the difference to the user. Never combine GA4 and GSC numbers in the same chart as if they measure the same thing.
- For Microsoft Ads: use run_microsoft_ads_query tool. Tables are prefixed msads_ (msads_campaign_performance: stats_date, campaign_id, campaign_name, campaign_status, impressions, clicks, cost, conversions, conversions_value, revenue; msads_keyword_performance: stats_date, campaign_id, campaign_name, ad_group_id, ad_group_name, keyword_text, match_type, impressions, clicks, cost, conversions; msads_search_query_performance: stats_date, search_query, campaign_id, campaign_name, impressions, clicks, cost, conversions; msads_account_info: account_id, account_name, currency_code, last_synced_at). Date column is stats_date. cost is in currency units. Use {dataset}.tableName format. IMPORTANT: msads tables do NOT have property_id — do not filter by property_id.
- CURRENCY: Display currency is ${displayCurrency} (${symbol}). ALL monetary columns (cost, spend, revenue, conversions_value) MUST be converted.${sourceCurrencies["GOOGLE_ADS"] ? `\n  Google Ads account currency: ${sourceCurrencies["GOOGLE_ADS"]}.` : ""}${sourceCurrencies["MICROSOFT_ADS"] ? `\n  Microsoft Ads account currency: ${sourceCurrencies["MICROSOFT_ADS"]}.` : ""}
  Exchange rates: \`{dataset}.exchange_rates\` (rate_date, base="USD", target, rate). 1 USD = rate target-units.
  SIMPLE CONVERSION for daily data: cost * SAFE_DIVIDE(tr.rate, sr.rate)
    LEFT JOIN \`{dataset}.exchange_rates\` sr ON sr.rate_date = [date_col] AND sr.target = '[SOURCE_CURRENCY]'
    LEFT JOIN \`{dataset}.exchange_rates\` tr ON tr.rate_date = [date_col] AND tr.target = '${displayCurrency}'
  SIMPLE CONVERSION for aggregated totals (no date dimension):
    Use subquery for latest rate: (SELECT rate FROM \`{dataset}.exchange_rates\` WHERE target='${displayCurrency}' ORDER BY rate_date DESC LIMIT 1) / (SELECT rate FROM \`{dataset}.exchange_rates\` WHERE target='[SOURCE_CURRENCY]' ORDER BY rate_date DESC LIMIT 1)
  Replace [SOURCE_CURRENCY] with the account currency shown above. Replace [date_col] with stats_date.
  Do NOT query account_info to get currency — use the values provided above.

RESPONSE FORMAT:
You MUST respond with exactly ONE of these formats:

For CHART widgets — wrap a MINIMAL ECharts config in [[chart]]...[[/chart]].
CRITICAL: Do NOT embed data values in the chart JSON. The system automatically populates chart data from your query results.
Just provide the chart structure with empty series data arrays:
[[chart]]{"title":{"text":"Daily Spend"},"series":[{"name":"Google Ads","type":"line","data":[]},{"name":"Microsoft Ads","type":"line","data":[]}]}[[/chart]]
Your SQL query results MUST return columns in this order: first column = dimension/category (e.g. date), remaining columns = one per series (e.g. google_ads_spend, microsoft_ads_spend). The column names become series names if you don't specify them.

Supported chart types (use the right type for the question):
- **bar**: Comparing categories (top pages, campaigns). SQL: dimension col + metric cols.
- **line**: Trends over time (daily sessions). SQL: date col + metric cols.
- **pie**: Proportions (traffic by device). SQL: name col + value col.
- **sankey**: User flows (page navigation). SQL: from_node, to_node, transitions cols.
- **funnel**: Conversion funnels (visits→leads→sales). SQL: stage col + value col, ordered by funnel step.
- **scatter**: Correlations (spend vs conversions). SQL: two numeric cols (x and y).
- **radar**: Multi-metric comparison (campaign performance). SQL: category col + multiple metric cols, few rows (3-6).
- **gauge**: Single KPI with progress (goal tracking). SQL: one numeric value.
- **heatmap**: Time patterns (sessions by day/hour). SQL: x category col, y category col, value col.
- **treemap**: Hierarchical breakdown (traffic by source). SQL: name col + value col.

For SCORECARD widgets — use [[scorecard]]VALUE|LABEL|CHANGE|SENTIMENT[[/scorecard]]:
The 4th field SENTIMENT is MANDATORY and must be "up_is_good" or "down_is_good". Think about what the metric means to a human:
- up_is_good: sessions, users, clicks, impressions, revenue, conversions, leads, followers, engagement — MORE is better
- down_is_good: cost per click, cost per lead, bounce rate, CPA, CPM, spend, churn rate — LESS is better
Examples:
[[scorecard]]12,847|Total Users|+12.3%|up_is_good[[/scorecard]]
[[scorecard]]${symbol}23.50|Cost per Click|-15.2%|down_is_good[[/scorecard]]
For monetary values, ALWAYS prefix with the currency symbol (${symbol}): [[scorecard]]${symbol}1,234.56|Cost per Lead|+8.2%|down_is_good[[/scorecard]]
The CHANGE is MANDATORY. Include a comparison vs the previous period using a SINGLE query with CASE expressions, e.g.: SELECT SUM(CASE WHEN date >= current_start THEN value ELSE 0 END) as current, SUM(CASE WHEN date >= prev_start AND date < current_start THEN value ELSE 0 END) as previous FROM table WHERE date >= prev_start. Compute percentage change: ((current - previous) / NULLIF(previous, 0) * 100). Format as +X% or -X%. If no previous data, use +0%.

For TABLE widgets — respond with [[table]]...[[/table]] containing a JSON array:
[[table]][{"column1":"value1","column2":123},...][[/table]]

Do NOT include any explanatory text. ONLY output the widget block.`;
}

// ---------------------------------------------------------------------------
// Parse widget response
// ---------------------------------------------------------------------------

const CHART_REGEX = /\[\[chart\]\]([\s\S]*?)\[\[\/chart\]\]/i;
const SCORECARD_REGEX = /\[\[scorecard\]\]([^|[\]]+)\|([^|[\]]+?)(?:\|([^|[\]]*?))?(?:\|([^[\]]*?))?\[\[\/scorecard\]\]/i;
const TABLE_REGEX = /\[\[table\]\]([\s\S]*?)\[\[\/table\]\]/i;

interface ParsedWidget {
  widgetType: "chart" | "scorecard" | "table";
  displayConfig: unknown;
  title: string;
}

function parseWidgetResponse(text: string, prompt: string): ParsedWidget | null {
  // Try chart
  const chartMatch = text.match(CHART_REGEX);
  if (chartMatch) {
    try {
      const option = JSON.parse(chartMatch[1].trim());
      return {
        widgetType: "chart",
        displayConfig: option,
        title: (option.title?.text as string) || "Chart",
      };
    } catch { /* fall through */ }
  }

  // Fallback: truncated [[chart]] block — try to repair the JSON
  if (text.includes("[[chart]]") && !text.includes("[[/chart]]")) {
    const chartStart = text.indexOf("[[chart]]") + "[[chart]]".length;
    let jsonStr = text.slice(chartStart).trim();
    // Try progressively closing open brackets to repair truncated JSON
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const option = JSON.parse(jsonStr);
        console.log("[widget-gen] Repaired truncated chart JSON");
        return {
          widgetType: "chart",
          displayConfig: option,
          title: (option.title?.text as string) || "Chart",
        };
      } catch {
        // Count open vs close braces/brackets to figure out what's missing
        const openBraces = (jsonStr.match(/\{/g) || []).length;
        const closeBraces = (jsonStr.match(/\}/g) || []).length;
        const openBrackets = (jsonStr.match(/\[/g) || []).length;
        const closeBrackets = (jsonStr.match(/\]/g) || []).length;
        // Remove any trailing partial value (cut at last complete value)
        jsonStr = jsonStr.replace(/,\s*"?[^"}\]]*$/, "");
        // Close remaining open brackets/braces
        const missingBrackets = openBrackets - closeBrackets;
        const missingBraces = openBraces - closeBraces;
        jsonStr += "]".repeat(Math.max(0, missingBrackets)) + "}".repeat(Math.max(0, missingBraces));
      }
    }
  }

  // Try scorecard
  const scorecardMatch = text.match(SCORECARD_REGEX);
  if (scorecardMatch) {
    const sentiment = scorecardMatch[4]?.trim();
    return {
      widgetType: "scorecard",
      displayConfig: {
        label: scorecardMatch[2].trim(),
        value: scorecardMatch[1].trim(),
        change: scorecardMatch[3]?.trim() || undefined,
        sentiment: sentiment === "down_is_good" ? "down_is_good" : "up_is_good",
      },
      title: scorecardMatch[2].trim(),
    };
  }

  // Try table
  const tableMatch = text.match(TABLE_REGEX);
  if (tableMatch) {
    try {
      const rows = JSON.parse(tableMatch[1].trim());
      const columns = Array.isArray(rows) && rows.length > 0
        ? Object.keys(rows[0]).map((k) => ({ key: k, label: k }))
        : [];
      return {
        widgetType: "table",
        displayConfig: { columns, inlineData: Array.isArray(rows) ? rows : undefined },
        title: prompt.slice(0, 60),
      };
    } catch { /* fall through */ }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/dashboards/:id/widgets
 * AI-powered widget creation from natural language prompt.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: dashboardId } = await params;
  const body = (await request.json()) as { prompt: string; includeGoal?: boolean; positionOverride?: { x: number; y: number } };

  if (!body.prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    // Load the dashboard to get its orgId
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      select: { orgId: true, layout: true },
    });
    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    // Resolve data sources and org settings
    const [orgDataSources, org] = await Promise.all([
      getOrgDataSources(dashboard.orgId),
      prisma.organization.findUnique({ where: { id: dashboard.orgId }, select: { displayCurrency: true } }),
    ]);
    const displayCurrency = org?.displayCurrency ?? "USD";
    console.log(`[widget-gen] displayCurrency=${displayCurrency}`);
    // Include ERROR status — data still exists in BigQuery even if the last sync failed
    const connectedStatuses = ["ACTIVE", "BACKFILLING", "ERROR"];
    const ga4Ds = orgDataSources.find((ds) => ds.type === "GA4_BIGQUERY" && connectedStatuses.includes(ds.status));
    const propertyId = ga4Ds?.propertyId ?? "";

    const adsCustomerId = orgDataSources.find((ds) => ds.type === "GOOGLE_ADS" && connectedStatuses.includes(ds.status))?.adsCustomerId ?? null;
    const linkedInOrgId = orgDataSources.find((ds) => ds.type === "LINKEDIN" && connectedStatuses.includes(ds.status))?.propertyId ?? null;
    const mailchimpListId = orgDataSources.find((ds) => ds.type === "MAILCHIMP" && connectedStatuses.includes(ds.status))?.propertyId ?? null;
    const gscSiteUrl = orgDataSources.find((ds) => ds.type === "SEARCH_CONSOLE" && connectedStatuses.includes(ds.status))?.propertyId ?? null;
    const msAdsAccountId = orgDataSources.find((ds) => ds.type === "MICROSOFT_ADS" && connectedStatuses.includes(ds.status))?.propertyId ?? null;
    const ahrefsOrgId = orgDataSources.find((ds) => ds.type === "AHREFS" && connectedStatuses.includes(ds.status)) ? dashboard.orgId : null;

    // Fetch source currencies so the AI knows them without querying account_info
    const sourceCurrencies = await getSourceCurrencies(adsCustomerId, msAdsAccountId);
    console.log(`[widget-gen] sourceCurrencies:`, sourceCurrencies);

    let systemPrompt = getWidgetSystemPrompt(!!adsCustomerId, !!linkedInOrgId, !!mailchimpListId, !!gscSiteUrl, !!msAdsAccountId, !!ahrefsOrgId, displayCurrency, sourceCurrencies);

    // Inject manual metrics so the AI knows about user-entered data
    const manualMetrics = await prisma.manualMetric.findMany({
      where: { orgId: dashboard.orgId },
      include: { entries: { orderBy: { period: "desc" } } },
    });
    const hasManualMetrics = manualMetrics.length > 0;
    if (hasManualMetrics) {
      const lines = manualMetrics.map((m) => {
        if (m.entries.length === 0) return `- ${m.name} (id: ${m.id}): No entries yet`;
        const entryLines = m.entries.map((e) => `${e.period}: ${e.value}${e.note ? ` (${e.note})` : ""}`);
        return `- ${m.name} (id: ${m.id}, format: ${m.displayFormat}): ${entryLines.join(", ")}`;
      });
      systemPrompt += `\n\nMANUAL METRICS (user-entered data, stored in PostgreSQL not BigQuery):
${lines.join("\n")}

To use manual metrics in widgets:
1. Call query_manual_metrics with the relevant metric IDs (and optional year filter).
2. The tool returns rows like: {"month": "Jan 2026", "Meta Leads": 10, "Website Leads": 5}
3. IMPORTANT: For manual metric charts, you MUST embed the actual data directly in the ECharts config — the auto-population system only works for BigQuery results.
4. Look at the data returned, think about what the user is asking, and build a complete ECharts config with the data filled in.
5. Do NOT query BigQuery for manual metrics — they only exist in PostgreSQL.

Example: if the tool returns [{"month":"Jan 2026","Leads":10},{"month":"Feb 2026","Leads":8}], output:
[[chart]]{"title":{"text":"Monthly Leads"},"xAxis":{"type":"category","data":["Jan 2026","Feb 2026"]},"yAxis":{"type":"value"},"series":[{"name":"Leads","type":"bar","data":[10,8]}]}[[/chart]]`;
    }

    // Build tools list — add manual metrics tool if needed
    const tools: Anthropic.Tool[] = [...BIGQUERY_TOOLS];
    if (hasManualMetrics) {
      tools.push({
        name: "query_manual_metrics",
        description: "Fetch manual metric entries for charting. Returns rows with period (YYYY-MM) and value columns for each requested metric.",
        input_schema: {
          type: "object" as const,
          properties: {
            metric_ids: { type: "array", items: { type: "string" }, description: "Array of manual metric IDs to fetch" },
            year: { type: "number", description: "Optional: filter to a specific year (e.g. 2026)" },
          },
          required: ["metric_ids"],
        },
      });
    }

    // Call Claude with tools
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: [{ role: "user", content: body.prompt }],
    });

    // Tool execution loop (max 3 rounds for widgets)
    const conversationMessages: Anthropic.MessageParam[] = [{ role: "user", content: body.prompt }];
    let toolRound = 0;
    let capturedQueryConfig: { tool: string; input: unknown } | null = null;
    let capturedData: unknown = null;

    while (response.stop_reason === "tool_use" && toolRound < 5) {
      toolRound++;
      const assistantContent = response.content;
      const toolUseBlocks = assistantContent.filter(
        (block): block is Anthropic.ContentBlockParam & { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
          block.type === "tool_use"
      );

      console.log(`[widget-gen] Tool round ${toolRound}:`, toolUseBlocks.map((t) => t.name).join(", "));

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        let result: unknown;
        let isError = false;

        try {
          switch (toolUse.name) {
            case "query_analytics": {
              const input = toolUse.input as unknown as QueryAnalyticsInput;
              const { sql, params } = buildAnalyticsSQL(input);
              result = await runPropertyQuery(propertyId, sql, params, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId);
              if (!capturedQueryConfig) {
                capturedQueryConfig = { tool: "query_analytics", input: toolUse.input };
                capturedData = (result as { rows: unknown }).rows;
              }
              break;
            }
            case "run_ads_query":
            case "run_linkedin_query":
            case "run_mailchimp_query":
            case "run_gsc_query":
            case "run_microsoft_ads_query":
            case "run_ahrefs_query": {
              const input = toolUse.input as { sql: string; description?: string };
              console.log(`[widget-gen] SQL (${toolUse.name}):`, input.sql);
              result = await runPropertyQuery(propertyId, input.sql, undefined, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId, ahrefsOrgId);
              if (!capturedQueryConfig) {
                capturedQueryConfig = { tool: toolUse.name, input: toolUse.input };
                capturedData = (result as { rows: unknown }).rows;
              }
              break;
            }
            case "get_realtime_data": {
              result = await queryRealtimeData(propertyId);
              capturedData = result;
              break;
            }
            case "get_available_fields": {
              result = await getPropertySchema(propertyId);
              break;
            }
            case "query_manual_metrics": {
              const input = toolUse.input as { metric_ids: string[]; year?: number };
              const entries = await prisma.manualMetricEntry.findMany({
                where: {
                  metricId: { in: input.metric_ids },
                  ...(input.year ? { period: { startsWith: String(input.year) } } : {}),
                },
                include: { metric: { select: { name: true } } },
                orderBy: { period: "asc" },
              });
              // Pivot into wide format: one row per period, one column per metric
              // e.g. { month: "Jan 2026", "Meta Leads": 10, "Website Leads": 5 }
              const periodMap = new Map<string, Record<string, unknown>>();
              const metricNames = new Set<string>();
              for (const e of entries) {
                metricNames.add(e.metric.name);
                if (!periodMap.has(e.period)) {
                  const [y, m] = e.period.split("-");
                  const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
                  periodMap.set(e.period, { month: label });
                }
                periodMap.get(e.period)![e.metric.name] = e.value;
              }
              // Fill missing metrics with 0
              const rows = Array.from(periodMap.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, row]) => {
                  for (const name of metricNames) {
                    if (!(name in row)) row[name] = 0;
                  }
                  return row;
                });
              result = { rows };
              // Don't set capturedData — the AI embeds data directly in the
              // ECharts config for manual metrics, so we skip auto-population.
              if (!capturedQueryConfig) {
                capturedQueryConfig = { tool: "query_manual_metrics", input: toolUse.input };
              }
              break;
            }
            default:
              result = { error: `Unknown tool: ${toolUse.name}` };
              isError = true;
          }
        } catch (error: unknown) {
          result = { error: error instanceof Error ? error.message : "Tool execution failed" };
          isError = true;
        }

        console.log(`[widget-gen] Tool ${toolUse.name}: ${isError ? "ERROR: " + JSON.stringify(result).slice(0, 200) : "OK"}, capturedData=${capturedData ? "set" : "null"}`);

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
          is_error: isError,
        });
      }

      conversationMessages.push({ role: "assistant", content: assistantContent });
      conversationMessages.push({ role: "user", content: toolResults });

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: conversationMessages,
      });
    }

    // If Claude still wants to call tools after max rounds, force a text response
    if (response.stop_reason === "tool_use") {
      console.log("[widget-gen] Max tool rounds reached, forcing text response");
      const assistantContent = response.content;
      const toolUseBlocks = assistantContent.filter(
        (block): block is Anthropic.ContentBlockParam & { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
          block.type === "tool_use"
      );
      const emptyResults = toolUseBlocks.map((t) => ({
        type: "tool_result" as const,
        tool_use_id: t.id,
        content: JSON.stringify({ error: "Tool limit reached. Output the widget visualization using the data from your previous successful query." }),
        is_error: true,
      }));
      conversationMessages.push({ role: "assistant", content: assistantContent });
      conversationMessages.push({ role: "user", content: emptyResults });
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: conversationMessages,
      });
    }

    // Extract the text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const rawText = textBlocks.map((b) => b.text).join("\n");

    // Parse the widget from Claude's response
    console.log("[widget-gen] Raw response:", rawText.slice(0, 500));
    console.log("[widget-gen] capturedData:", capturedData ? `array=${Array.isArray(capturedData)} length=${Array.isArray(capturedData) ? (capturedData as unknown[]).length : "n/a"}` : "null");
    console.log("[widget-gen] capturedQueryConfig:", capturedQueryConfig ? capturedQueryConfig.tool : "null");
    console.log("[widget-gen] stop_reason:", response.stop_reason);
    let parsed = parseWidgetResponse(rawText, body.prompt);

    // Fallback: if Claude didn't use widget blocks but returned data, try to create a table widget
    if (!parsed && capturedData && Array.isArray(capturedData) && (capturedData as unknown[]).length > 0) {
      console.log("[widget-gen] No widget block found, falling back to table from captured data");
      const rows = capturedData as Record<string, unknown>[];
      parsed = {
        widgetType: "table",
        displayConfig: { columns: Object.keys(rows[0]).map((k) => ({ key: k, label: k.replace(/_/g, " ") })) },
        title: body.prompt.slice(0, 50),
      };
    }

    // Fallback: try extracting a JSON object that looks like an ECharts option
    if (!parsed) {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const option = JSON.parse(jsonMatch[1].trim());
          if (option.series || option.xAxis || option.yAxis) {
            parsed = { widgetType: "chart", displayConfig: option, title: option.title?.text || body.prompt.slice(0, 50) };
          }
        } catch { /* ignore */ }
      }
    }

    if (!parsed) {
      console.error("[widget-gen] Failed to parse widget from response:", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to generate widget.", raw: rawText.slice(0, 500) || "(empty response — check API credits)" },
        { status: 422 }
      );
    }

    // Store includeGoal flag in displayConfig so it persists with the widget
    if (body.includeGoal) {
      (parsed.displayConfig as Record<string, unknown>)._includeGoal = true;
    }

    // Create the widget
    const widget = await prisma.widget.create({
      data: {
        dashboardId,
        prompt: body.prompt,
        widgetType: parsed.widgetType,
        queryConfig: (capturedQueryConfig ?? {}) as object,
        displayConfig: parsed.displayConfig as object,
        cachedData: capturedData
          ? (capturedData as object)
          : (parsed.displayConfig as Record<string, unknown>)?.inlineData
            ? ((parsed.displayConfig as Record<string, unknown>).inlineData as object)
            : undefined,
        cachedAt: capturedData || (parsed.displayConfig as Record<string, unknown>)?.inlineData
          ? new Date()
          : undefined,
        title: parsed.title,
      },
    });

    // Add widget to the dashboard layout
    // Get existing widget IDs to clean stale layout entries
    const existingWidgets = await prisma.widget.findMany({
      where: { dashboardId },
      select: { id: true },
    });
    const existingIds = new Set(existingWidgets.map((w) => w.id));
    const rawLayout = (dashboard.layout as Array<{ i: string; x: number; y: number; w: number; h: number }>) || [];
    // Filter out layout entries for deleted widgets
    const layout = rawLayout.filter((item) => existingIds.has(item.i));
    // Smart default sizes based on widget and chart type
    // Fixed sizes per widget type — must match DashboardGrid.getFixedSize
    function getWidgetSize(widgetType: string, displayConfig: unknown): { w: number; h: number } {
      if (widgetType === "scorecard") return { w: 4, h: 2 };
      if (widgetType === "table") return { w: 12, h: 4 };
      if (widgetType === "chart" && displayConfig) {
        const config = displayConfig as Record<string, unknown>;
        const series = config.series;
        const seriesArr = Array.isArray(series) ? series : series ? [series] : [];
        const chartType = (seriesArr[0] as Record<string, unknown>)?.type as string | undefined;
        if (chartType === "sankey" || chartType === "map") return { w: 12, h: 5 };
        if (chartType === "pie") return { w: 6, h: 4 };
        return { w: 6, h: 4 };
      }
      return { w: 6, h: 4 };
    }

    const size = getWidgetSize(parsed.widgetType, parsed.displayConfig);

    if (body.positionOverride) {
      // Edit/regenerate: place at the same position as the old widget
      layout.push({ i: widget.id, x: body.positionOverride.x, y: body.positionOverride.y, w: size.w, h: size.h });
    } else {
      const maxBottom = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
      // Try to place side-by-side if there's room on the last row
      let x = 0;
      const lastRowY = layout.length > 0 ? Math.max(...layout.map((item) => item.y)) : 0;
      const lastRowItems = layout.filter((item) => item.y === lastRowY);
      const lastRowRight = lastRowItems.reduce((max, item) => Math.max(max, item.x + item.w), 0);
      if (lastRowRight + size.w <= 12) {
        x = lastRowRight;
        layout.push({ i: widget.id, x, y: lastRowY, w: size.w, h: size.h });
      } else {
        layout.push({ i: widget.id, x: 0, y: maxBottom, w: size.w, h: size.h });
      }
    }

    await prisma.dashboard.update({
      where: { id: dashboardId },
      data: { layout },
    });

    return NextResponse.json({ widget, layout }, { status: 201 });
  } catch (err) {
    console.error("[api/dashboards/:id/widgets] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create widget", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
