import Anthropic from "@anthropic-ai/sdk";
import { runReport, runRealtimeReport, getMetadata } from "@/lib/ga4";
import { runPropertyQuery, queryRealtimeData, getPropertySchema } from "@/lib/bigquery";
import { GA4_TOOLS, BIGQUERY_TOOLS } from "@/lib/tools";
import { ALERT_TYPES, buildCustomPrompt } from "@/lib/alert-prompts";
import { prisma } from "@/lib/prisma";

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

const GA4_ALERT_SYSTEM_PROMPT = `You are a Google Analytics expert that generates concise, professional email reports. You query GA4 data using the provided tools and return a well-formatted HTML summary.

You have access to these tools:
- run_report: Query historical GA4 data with metrics, dimensions, date ranges, and sorting.
- run_realtime_report: See real-time data from the last 30 minutes.
- get_metadata: Discover available metrics and dimensions.

Common metrics: activeUsers, sessions, screenPageViews, bounceRate, averageSessionDuration, totalRevenue, conversions, engagementRate, eventCount, newUsers
Common dimensions: date, country, city, source, medium, pagePath, deviceCategory, sessionDefaultChannelGroup, eventName, browser, operatingSystem

Important rules:
- Return ONLY clean HTML with inline styles. No markdown, no code fences, no explanation outside the HTML.
- Format large numbers with commas.
- Keep the report concise and scannable — this goes in an email body.
- Use the tools to fetch real data before writing the report.
- Every report must follow this structure: a short overview paragraph, data presented in tables, an "Observations" section with bullet points, and a "Recommendations" section with bullet points.
- Use <h3> for section headings. Do NOT use <h1> or <h2>.
- Follow the detailed styling rules in the user prompt exactly.`;

function getBigQueryAlertSystemPrompt(
  hasAds = false,
  hasLinkedIn = false,
  hasMailchimp = false,
  hasGsc = false,
  hasMsAds = false,
  displayCurrency = "USD"
): string {
  const today = new Date().toISOString().split("T")[0];

  const adsTablesPrompt = hasAds ? `
  - campaign_performance: Daily Google Ads campaign metrics (stats_date, campaign_id, campaign_name, campaign_status, impressions, clicks, cost_micros, cost, conversions, conversions_value)
  - keyword_performance: Daily keyword/ad-group metrics (stats_date, campaign_id, campaign_name, ad_group_id, ad_group_name, keyword_text, match_type, impressions, clicks, cost_micros, cost, conversions)
  - click_attribution: Per-click data with gclid (click_date, gclid, campaign_id, campaign_name, ad_group_id, keyword_text)
  - account_info: Account metadata (customer_id, currency_code, descriptive_name, last_synced_at)` : "";

  const msAdsTablesPrompt = hasMsAds ? `
  - msads_campaign_performance: Daily Bing campaign metrics (stats_date, campaign_id, campaign_name, campaign_status, impressions, clicks, cost, conversions, conversions_value, revenue)
  - msads_keyword_performance: Daily Bing keyword/ad-group metrics (stats_date, campaign_id, campaign_name, ad_group_id, ad_group_name, keyword_text, match_type, impressions, clicks, cost, conversions)
  - msads_search_query_performance: Daily Bing search query report (stats_date, search_query, campaign_id, campaign_name, ad_group_id, ad_group_name, impressions, clicks, cost, conversions)
  - msads_account_info: Account metadata (account_id, account_name, currency_code, last_synced_at)` : "";

  const linkedInTablesPrompt = hasLinkedIn ? `
  - post_performance: Daily LinkedIn post metrics (post_date, post_urn, post_text, impressions, clicks, comments, likes, shares, engagements)
  - follower_stats: Daily follower gains (stats_date, total_followers, organic_gains, paid_gains)
  - follower_demographics: Follower breakdowns (stats_date, dimension, dimension_value, follower_count)
  - page_stats: Daily page engagement (stats_date, page_views, unique_visitors, clicks)
  - org_info: Organization metadata (organization_id, organization_name, vanity_name, last_synced_at)` : "";

  const mailchimpTablesPrompt = hasMailchimp ? `
  - campaign_reports: Per-campaign email metrics (send_date, campaign_id, campaign_title, subject_line, emails_sent, opens_total, unique_opens, open_rate, clicks_total, unique_clicks, click_rate, hard_bounces, soft_bounces, unsubscribed, total_revenue)
  - audience_stats: Daily audience snapshot (stats_date, list_id, list_name, member_count, total_contacts, unsubscribe_count, cleaned_count, campaign_count, open_rate, click_rate)
  - audience_growth: Monthly subscriber growth (month_date, list_id, subscribed, unsubscribed, cleaned, pending, deleted)
  - mc_account_info: Account metadata (account_name, list_id, list_name, dc, last_synced_at)` : "";

  const gscTablesPrompt = hasGsc ? `
  - search_performance: Daily search metrics (query_date, query, page, country, device, clicks, impressions, ctr, position)
  - site_info: Site metadata (site_url, permission_level, last_synced_at)` : "";

  const adsQueryGuidance = hasAds ? `
- For Google Ads data, use the run_ads_query tool. Date column: stats_date. cost is already in currency units.
- CTR = clicks / impressions. CPC = cost / clicks. ROAS = conversions_value / cost.` : "";

  const msAdsQueryGuidance = hasMsAds ? `
- For Microsoft/Bing Ads data, use the run_microsoft_ads_query tool. Table names are prefixed with msads_. Date column: stats_date. cost is already in currency units.
- CTR = clicks / impressions. CPC = cost / clicks. ROAS = conversions_value / cost.
- To compare Google Ads vs Microsoft Ads, run separate queries and present side-by-side.` : "";

  const linkedInQueryGuidance = hasLinkedIn ? `
- For LinkedIn data, use the run_linkedin_query tool. Date columns: post_date for post_performance, stats_date for follower/page tables.
- For daily metrics, use daily_impressions, daily_clicks, daily_engagements columns (not the cumulative ones).` : "";

  const mailchimpQueryGuidance = hasMailchimp ? `
- For Mailchimp data, use the run_mailchimp_query tool. Date columns: send_date for campaign_reports, stats_date for audience_stats.` : "";

  const gscQueryGuidance = hasGsc ? `
- For Google Search Console data, use the run_gsc_query tool. Date column: query_date. CTR is 0-1 decimal, position lower is better.` : "";

  const currencySymbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", ZAR: "R", AUD: "A$", CAD: "C$", JPY: "¥",
  };
  const symbol = currencySymbols[displayCurrency] || displayCurrency;

  const currencyGuidance = (hasAds || hasMsAds) ? `

CURRENCY CONVERSION (CRITICAL):
- The organization's display currency is ${displayCurrency} (symbol: ${symbol}).
- ALL monetary values (cost, spend, revenue, conversions_value) MUST be displayed in ${displayCurrency}.
- Ad account native currencies may differ from ${displayCurrency}. ALWAYS convert using the exchange_rates table before displaying.
- Exchange rates are available in \`{dataset}.exchange_rates\` with columns: rate_date (DATE), base ("USD"), target (STRING), rate (FLOAT64). All rates are USD-based: 1 USD = rate target units.
- To convert a value from source currency to ${displayCurrency}:
  value * SAFE_DIVIDE(target_rate.rate, source_rate.rate)
  where source_rate.target = source_currency_code and target_rate.target = '${displayCurrency}'.
- For daily data, JOIN on rate_date = stats_date for historically accurate conversion.
- Example conversion for Google Ads:
  SELECT SUM(cp.cost * SAFE_DIVIDE(tr.rate, sr.rate)) AS cost
  FROM \`{dataset}.campaign_performance\` cp
  CROSS JOIN (SELECT currency_code FROM \`{dataset}.account_info\` LIMIT 1) ai
  LEFT JOIN \`{dataset}.exchange_rates\` sr ON sr.rate_date = cp.stats_date AND sr.target = ai.currency_code
  LEFT JOIN \`{dataset}.exchange_rates\` tr ON tr.rate_date = cp.stats_date AND tr.target = '${displayCurrency}'
  WHERE cp.stats_date >= @startDate
- Example conversion for Microsoft Ads: same pattern but use msads_campaign_performance and msads_account_info.
- If the source account is already in ${displayCurrency}, the rate ratio is 1 (no-op).
- Always display values with the ${symbol} symbol. Always ROUND monetary values to 2 decimal places.
- When comparing cross-platform data (Google Ads + Microsoft Ads), convert BOTH to ${displayCurrency} before summing or comparing.` : "";

  const toolList: string[] = [
    "- query_analytics: Query GA4 analytics data (sessions, pageviews, users, traffic sources, conversions, etc.)",
    "- run_ads_query: Run custom SQL queries for complex JOINs, CTEs, or cross-table queries. Works with ALL tables.",
  ];
  if (hasMsAds) toolList.push("- run_microsoft_ads_query: Query Microsoft/Bing Ads data (campaigns, keywords, search queries, spend). Use {dataset}.tableName.");
  if (hasLinkedIn) toolList.push("- run_linkedin_query: Query LinkedIn analytics (posts, followers, demographics). Use {dataset}.tableName.");
  if (hasMailchimp) toolList.push("- run_mailchimp_query: Query Mailchimp email marketing data (campaigns, audience). Use {dataset}.tableName.");
  if (hasGsc) toolList.push("- run_gsc_query: Query Google Search Console data (search queries, impressions, clicks, CTR, position). Use {dataset}.tableName.");
  toolList.push("- get_realtime_data: See active users in the last 30 minutes.");
  toolList.push("- get_available_fields: Discover available tables and columns.");

  return `You are an analytics expert that generates concise, professional email reports. You query analytics data from BigQuery using the provided tools and return a well-formatted HTML summary.

Today's date is ${today}. Data is exported daily and may be up to 24 hours behind — today's data is typically not available until tomorrow.

You have access to these tools:
${toolList.join("\n")}

Available tables and columns for query_analytics:
  - sessions: session_key, property_id, user_pseudo_id, ga_session_id, session_date, session_start, session_end, session_duration_seconds, pageviews, total_engagement_time_msec, is_engaged, is_bounce, landing_page, exit_page, session_source, session_medium, session_default_channel_group, device_category, device_os, device_browser, geo_country, geo_city, ga_session_number, is_first_visit
  - pageviews: property_id, user_pseudo_id, ga_session_id, event_date, event_timestamp, page_location, page_title, page_referrer, engagement_time_msec, session_source, session_medium, session_default_channel_group, device_category, device_os, device_browser, geo_country, geo_city
  - users: property_id, user_pseudo_id, first_seen, last_seen, total_sessions, total_pageviews, avg_session_duration_seconds, bounce_rate, total_engagement_time_msec, acquisition_source, acquisition_medium, acquisition_channel_group, acquisition_landing_page, device_category, geo_country, geo_city, is_new_user
  - conversions: property_id, user_pseudo_id, ga_session_id, event_date, event_timestamp, event_name, page_location, page_title, session_source, session_medium, session_default_channel_group, device_category, geo_country
  - traffic_sources: session_date, property_id, source, medium, channel_group, sessions, users, new_users, pageviews, bounce_rate, avg_session_duration_seconds, avg_engagement_time_msec
  - stg_events: raw flattened event data (event_date, event_timestamp, event_name, user_pseudo_id, ga_session_id, page_location, page_title, session_source, session_medium, device_category, geo_country, engagement_time_msec)${adsTablesPrompt}${msAdsTablesPrompt}${linkedInTablesPrompt}${mailchimpTablesPrompt}${gscTablesPrompt}
${adsQueryGuidance}${msAdsQueryGuidance}${linkedInQueryGuidance}${mailchimpQueryGuidance}${gscQueryGuidance}${currencyGuidance}

CRITICAL RULES:
1. NEVER fabricate, estimate, or assume any numbers. Every number you present MUST come directly from a tool response in this conversation.
2. NEVER invent data that does not exist in the available tables. In particular: there are NO budget, target, goal, plan, or forecast tables. Do NOT include "budget", "target", "% of budget", "remaining budget", or similar columns unless the user's request explicitly provides those values.
3. If the user asks for something you cannot compute from the available tables, say so plainly in the report — do not make up numbers to fill the gap.
4. Use the tools to fetch real data before writing the report. Make as many tool calls as needed.
5. Return ONLY clean HTML with inline styles. No markdown, no code fences, no explanation outside the HTML.
6. Format large numbers with commas.
7. Keep the report concise and scannable — this goes in an email body.
8. Every report must follow this structure: a short overview paragraph, data presented in tables, an "Observations" section with bullet points, and a "Recommendations" section with bullet points.
9. Use <h3> for section headings. Do NOT use <h1> or <h2>.
10. Follow the detailed styling rules in the user prompt exactly.
11. Always use {dataset}.tableName for all table references in raw SQL tools.`;
}

// ---------------------------------------------------------------------------
// BigQuery SQL builder (same as chat route)
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
      case "conversions":
        if (table.startsWith("ads_")) {
          selectParts.push("SUM(conversions) AS conversions");
        } else {
          selectParts.push("COUNT(*) AS conversions");
        }
        break;
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
      default:
        if (table === "traffic_sources") {
          selectParts.push(`SUM(${metric}) AS ${metric}`);
        } else {
          selectParts.push(metric);
        }
    }
  }

  const selectClause = selectParts.join(", ");
  const whereParts: string[] = [];
  const params: Record<string, unknown> = {};

  const isAccountInfo = table === "account_info" || table === "msads_account_info";
  const dateColumn =
    table === "traffic_sources" || table === "sessions" ? "session_date" :
    table === "campaign_performance" || table === "keyword_performance" ? "stats_date" :
    table.startsWith("msads_") && table !== "msads_account_info" ? "stats_date" :
    table === "click_attribution" ? "click_date" :
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
  const orderByClause = orderBy ? `ORDER BY ${orderBy.field} ${orderBy.direction || "DESC"}` : "";
  const limitClause = `LIMIT ${Math.min(limit || 10, 500)}`;

  const sql = `SELECT ${selectClause} FROM \`{dataset}.${table}\` ${whereClause} ${groupByClause} ${orderByClause} ${limitClause}`;
  return { sql, params };
}

// ---------------------------------------------------------------------------
// Tool execution helpers
// ---------------------------------------------------------------------------

async function executeGA4Tool(
  toolUse: { name: string; input: Record<string, unknown> },
  accessToken: string,
  propertyId: string
): Promise<{ result: unknown; isError: boolean }> {
  try {
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
        return {
          result: await runReport(accessToken, {
            propertyId,
            metrics: input.metrics,
            dimensions: input.dimensions,
            startDate: input.startDate,
            endDate: input.endDate,
            limit: Math.min(input.limit || 10, 100),
            orderBys: input.orderBys,
          }),
          isError: false,
        };
      }
      case "run_realtime_report": {
        const input = toolUse.input as { metrics: string[]; dimensions?: string[]; limit?: number };
        return {
          result: await runRealtimeReport(accessToken, {
            propertyId,
            metrics: input.metrics,
            dimensions: input.dimensions,
            limit: Math.min(input.limit || 10, 100),
          }),
          isError: false,
        };
      }
      case "get_metadata": {
        const input = toolUse.input as { type?: string };
        const metadata = await getMetadata(accessToken, propertyId);
        if (input.type === "metrics") return { result: { metrics: metadata.metrics }, isError: false };
        if (input.type === "dimensions") return { result: { dimensions: metadata.dimensions }, isError: false };
        return { result: metadata, isError: false };
      }
      default:
        return { result: { error: `Unknown tool: ${toolUse.name}` }, isError: true };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Tool execution failed";
    return { result: { error: message }, isError: true };
  }
}

/** Data source IDs for BigQuery tool execution */
export interface AlertDataSources {
  propertyId: string;
  adsCustomerId?: string | null;
  linkedInOrgId?: string | null;
  mailchimpListId?: string | null;
  gscSiteUrl?: string | null;
  msAdsAccountId?: string | null;
}

async function executeBigQueryTool(
  toolUse: { name: string; input: Record<string, unknown> },
  ds: AlertDataSources
): Promise<{ result: unknown; isError: boolean }> {
  try {
    switch (toolUse.name) {
      case "query_analytics": {
        const input = toolUse.input as unknown as QueryAnalyticsInput;
        const { sql, params } = buildAnalyticsSQL(input);
        return { result: await runPropertyQuery(ds.propertyId, sql, params, ds.adsCustomerId, ds.linkedInOrgId, ds.mailchimpListId, ds.gscSiteUrl, ds.msAdsAccountId), isError: false };
      }
      case "run_ads_query": {
        const input = toolUse.input as { sql: string; description?: string };
        console.log("[alert-content] Ads query:", input.description || "custom");
        return { result: await runPropertyQuery(ds.propertyId, input.sql, undefined, ds.adsCustomerId, ds.linkedInOrgId, ds.mailchimpListId, ds.gscSiteUrl, ds.msAdsAccountId), isError: false };
      }
      case "run_microsoft_ads_query": {
        const input = toolUse.input as { sql: string; description?: string };
        console.log("[alert-content] Microsoft Ads query:", input.description || "custom");
        return { result: await runPropertyQuery(ds.propertyId, input.sql, undefined, ds.adsCustomerId, ds.linkedInOrgId, ds.mailchimpListId, ds.gscSiteUrl, ds.msAdsAccountId), isError: false };
      }
      case "run_linkedin_query": {
        const input = toolUse.input as { sql: string; description?: string };
        console.log("[alert-content] LinkedIn query:", input.description || "custom");
        return { result: await runPropertyQuery(ds.propertyId, input.sql, undefined, ds.adsCustomerId, ds.linkedInOrgId, ds.mailchimpListId, ds.gscSiteUrl, ds.msAdsAccountId), isError: false };
      }
      case "run_mailchimp_query": {
        const input = toolUse.input as { sql: string; description?: string };
        console.log("[alert-content] Mailchimp query:", input.description || "custom");
        return { result: await runPropertyQuery(ds.propertyId, input.sql, undefined, ds.adsCustomerId, ds.linkedInOrgId, ds.mailchimpListId, ds.gscSiteUrl, ds.msAdsAccountId), isError: false };
      }
      case "run_gsc_query": {
        const input = toolUse.input as { sql: string; description?: string };
        console.log("[alert-content] GSC query:", input.description || "custom");
        return { result: await runPropertyQuery(ds.propertyId, input.sql, undefined, ds.adsCustomerId, ds.linkedInOrgId, ds.mailchimpListId, ds.gscSiteUrl, ds.msAdsAccountId), isError: false };
      }
      case "get_realtime_data":
        return { result: await queryRealtimeData(ds.propertyId), isError: false };
      case "get_available_fields":
        return { result: await getPropertySchema(ds.propertyId), isError: false };
      default:
        return { result: { error: `Unknown tool: ${toolUse.name}` }, isError: true };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Tool execution failed";
    return { result: { error: message }, isError: true };
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate alert email content by running the prompt against the user's analytics data.
 *
 * @param accessToken    - Google OAuth access token (required for GA4 path, ignored for BigQuery)
 * @param propertyId     - GA4 property ID (can be empty for org-only alerts)
 * @param alertType      - Key from ALERT_TYPES (e.g. "weekly_snapshot" or "custom")
 * @param frequency      - e.g. "daily" | "weekly" | "monthly" (used for context in the prompt)
 * @param customPrompt   - User-defined prompt text (required when alertType is "custom")
 * @param usesBigQuery   - Whether to use BigQuery path instead of GA4 API
 * @param dataSources    - Optional org-level data source IDs for multi-platform queries
 * @param displayCurrency - Display currency code (default: USD)
 * @returns The generated HTML string for the email body
 */
export async function generateAlertContent(
  accessToken: string,
  propertyId: string,
  alertType: string,
  frequency: string,
  customPrompt?: string | null,
  usesBigQuery: boolean = false,
  dataSources?: AlertDataSources | null,
  displayCurrency: string = "USD",
  orgId?: string | null
): Promise<string> {
  let promptText: string;

  if (alertType === "custom") {
    if (!customPrompt) {
      throw new Error("Custom alert type requires a customPrompt");
    }
    promptText = buildCustomPrompt(customPrompt);
  } else {
    const typeDefinition = ALERT_TYPES[alertType];
    if (!typeDefinition) {
      throw new Error(`Unknown alert type: ${alertType}`);
    }
    promptText = typeDefinition.prompt;
  }

  const userPrompt = propertyId
    ? `${promptText}\n\nThis is a ${frequency} report. The GA4 property ID is ${propertyId}.`
    : `${promptText}\n\nThis is a ${frequency} report.`;

  // Determine which data sources are available
  const ds: AlertDataSources = dataSources || { propertyId };
  const hasAds = !!ds.adsCustomerId;
  const hasLinkedIn = !!ds.linkedInOrgId;
  const hasMailchimp = !!ds.mailchimpListId;
  const hasGsc = !!ds.gscSiteUrl;
  const hasMsAds = !!ds.msAdsAccountId;

  let systemPrompt = usesBigQuery
    ? getBigQueryAlertSystemPrompt(hasAds, hasLinkedIn, hasMailchimp, hasGsc, hasMsAds, displayCurrency)
    : GA4_ALERT_SYSTEM_PROMPT;
  const tools = usesBigQuery ? BIGQUERY_TOOLS : GA4_TOOLS;

  // Inject organization KPIs with pre-computed values into system prompt for email alerts
  if (orgId) {
    const orgKpis = await prisma.kpi.findMany({
      where: { orgId },
      orderBy: { sortOrder: "asc" },
    });
    if (orgKpis.length > 0) {
      // Refresh stale KPIs
      const { isKpiStale, refreshOrgKpis } = await import("@/lib/kpi-executor");
      const hasStale = orgKpis.some((k) => isKpiStale(k));
      let freshKpis = orgKpis;
      if (hasStale) {
        try {
          await refreshOrgKpis(orgId);
          freshKpis = await prisma.kpi.findMany({
            where: { orgId },
            orderBy: { sortOrder: "asc" },
          });
        } catch (e) {
          console.error("[alert-content] KPI refresh failed, using cached values:", e);
        }
      }

      const kpiLines = freshKpis.map((k) => {
        const fmt = k.displayFormat === "percentage" ? "percentage" : k.displayFormat === "currency" ? "currency" : "number";
        if (k.cachedValue !== null && k.cachedValue !== undefined) {
          const progress = k.targetValue !== 0 ? ((k.cachedValue / k.targetValue) * 100).toFixed(1) : "N/A";
          const onTrack = k.targetDirection === "below"
            ? k.cachedValue <= k.targetValue
            : k.cachedValue >= k.targetValue;
          const status = onTrack ? "ON-TRACK" : "OFF-TRACK";
          return `- ${k.name}: Actual = ${k.cachedValue.toLocaleString()} | Target = ${k.targetValue.toLocaleString()} | ${progress}% — ${status} (${k.timePeriod}, format: ${fmt})`;
        }
        return `- ${k.name}: Target ${k.targetDirection} ${k.targetValue} per ${k.timePeriod} (format: ${fmt}). No cached value available.`;
      });
      systemPrompt += `\n\nORGANIZATION KPIs (current values):\n${kpiLines.join("\n")}\n\nInclude a "KPI Progress" section in the report. Use the pre-computed values above — do NOT run queries for these. Present as a table with green checkmark for on-track, red X for off-track. Show: KPI Name | Actual | Target | Progress % | Status.`;
    }
  }

  // Inject manual metrics for alerts
  if (orgId) {
    const manualMetrics = await prisma.manualMetric.findMany({
      where: { orgId },
      include: { entries: { orderBy: { period: "desc" }, take: 6 } },
    });
    if (manualMetrics.length > 0) {
      const lines = manualMetrics.map((m) => {
        if (m.entries.length === 0) return `- ${m.name}: No entries logged yet`;
        const entryLines = m.entries.map((e) => `${e.period}: ${e.value}${e.note ? ` (${e.note})` : ""}`);
        return `- ${m.name} (format: ${m.displayFormat}): ${entryLines.join(", ")}`;
      });
      systemPrompt += `\n\nMANUAL METRICS (user-entered data):\n${lines.join("\n")}\n\nInclude any notable trends from manual metrics in the report where relevant.`;
    }
  }

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  const anthropic = getAnthropic();

  console.log(`[alert-content] Starting generation for property ${propertyId}, type=${alertType}, freq=${frequency}, bigquery=${usesBigQuery}, ads=${hasAds}, msads=${hasMsAds}, linkedin=${hasLinkedIn}, mailchimp=${hasMailchimp}, gsc=${hasGsc}`);

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    tools,
    messages,
  });

  // Agentic tool-use loop — accumulate full conversation across rounds
  let round = 0;
  const MAX_TOOL_ROUNDS = 15;
  while (response.stop_reason === "tool_use" && round < MAX_TOOL_ROUNDS) {
    round++;
    const assistantContent = response.content;

    // Append assistant turn to conversation
    messages.push({ role: "assistant", content: assistantContent });

    const toolUseBlocks = assistantContent.filter(
      (
        block
      ): block is Anthropic.ContentBlockParam & {
        type: "tool_use";
        id: string;
        name: string;
        input: Record<string, unknown>;
      } => block.type === "tool_use"
    );

    console.log(`[alert-content] Round ${round}: ${toolUseBlocks.length} tool call(s) — ${toolUseBlocks.map((t) => t.name).join(", ")}`);

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const { result, isError } = usesBigQuery
        ? await executeBigQueryTool(toolUse, ds)
        : await executeGA4Tool(toolUse, accessToken, propertyId);

      if (isError) {
        console.error(`[alert-content] Tool ${toolUse.name} failed:`, result);
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
        is_error: isError,
      });
    }

    // Append tool results as a user turn and continue
    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  console.log(`[alert-content] Generation complete after ${round} tool-use round(s), stop_reason=${response.stop_reason}`);

  // If we exited the loop still in tool_use state (hit the round cap), force a
  // final no-tool call so the model produces the HTML report from what it has.
  if (response.stop_reason === "tool_use") {
    console.log(`[alert-content] Hit MAX_TOOL_ROUNDS — forcing final text response`);
    // Append the last assistant turn and synthetic tool results so the
    // conversation is well-formed, then call again without tools.
    messages.push({ role: "assistant", content: response.content });
    const lastToolUses = response.content.filter(
      (b): b is Anthropic.ContentBlockParam & { type: "tool_use"; id: string } =>
        b.type === "tool_use"
    );
    if (lastToolUses.length > 0) {
      messages.push({
        role: "user",
        content: lastToolUses.map((t) => ({
          type: "tool_result" as const,
          tool_use_id: t.id,
          content: JSON.stringify({ error: "Tool budget exhausted — produce the final HTML report now using the data already gathered." }),
          is_error: true,
        })),
      });
    }
    messages.push({
      role: "user",
      content: "You have exhausted your tool call budget. Produce the final HTML email report NOW using only the data already gathered in this conversation. Do not call any more tools. If some data is missing, note that in the report rather than trying to fetch it.",
    });
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });
  }

  // Extract the final text
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textBlocks.map((b) => b.text).join("\n").trim();
}
