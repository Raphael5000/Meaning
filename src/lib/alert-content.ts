import Anthropic from "@anthropic-ai/sdk";
import { runReport, runRealtimeReport, getMetadata } from "@/lib/ga4";
import { runPropertyQuery, queryRealtimeData, getPropertySchema } from "@/lib/bigquery";
import { GA4_TOOLS, BIGQUERY_TOOLS } from "@/lib/tools";
import { ALERT_TYPES, buildCustomPrompt } from "@/lib/alert-prompts";

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

function getBigQueryAlertSystemPrompt(): string {
  const today = new Date().toISOString().split("T")[0];
  return `You are an analytics expert that generates concise, professional email reports. You query analytics data from BigQuery using the provided tools and return a well-formatted HTML summary.

Today's date is ${today}. Data is exported daily and may be up to 24 hours behind — today's data is typically not available until tomorrow.

You have access to these tools:
- query_analytics: Query analytics data. Specify a table, metrics, dimensions, filters, date range, and ordering. Available tables:
  - sessions: session_key, property_id, user_pseudo_id, ga_session_id, session_date, session_start, session_end, session_duration_seconds, pageviews, total_engagement_time_msec, is_engaged, is_bounce, landing_page, exit_page, session_source, session_medium, session_default_channel_group, device_category, device_os, device_browser, geo_country, geo_city, ga_session_number, is_first_visit
  - pageviews: property_id, user_pseudo_id, ga_session_id, event_date, event_timestamp, page_location, page_title, page_referrer, engagement_time_msec, session_source, session_medium, session_default_channel_group, device_category, device_os, device_browser, geo_country, geo_city
  - users: property_id, user_pseudo_id, first_seen, last_seen, total_sessions, total_pageviews, avg_session_duration_seconds, bounce_rate, total_engagement_time_msec, acquisition_source, acquisition_medium, acquisition_channel_group, acquisition_landing_page, device_category, geo_country, geo_city, is_new_user
  - conversions: property_id, user_pseudo_id, ga_session_id, event_date, event_timestamp, event_name, page_location, page_title, session_source, session_medium, session_default_channel_group, device_category, geo_country
  - traffic_sources: session_date, property_id, source, medium, channel_group, sessions, users, new_users, pageviews, bounce_rate, avg_session_duration_seconds, avg_engagement_time_msec
  - stg_events: raw flattened event data (event_date, event_timestamp, event_name, user_pseudo_id, ga_session_id, page_location, page_title, session_source, session_medium, device_category, geo_country, engagement_time_msec)
  - ads_campaign_performance: Daily Google Ads campaign metrics (stats_date, campaign_id, campaign_name, impressions, clicks, cost, conversions, conversions_value, ctr, cpc, cpa, roas)
  - ads_keyword_performance: Daily keyword/ad-group metrics (stats_date, campaign_name, ad_group_name, keyword_text, match_type, impressions, clicks, cost, ctr, cpc, roas)
  - ads_ga4_attribution: GA4 sessions attributed to Ads clicks via gclid (session_date, campaign_name, ad_group_name, keyword_text, pageviews, is_bounce, landing_page)
  - ads_attribution_summary: Daily aggregated attribution with ROI (session_date, campaign_name, attributed_sessions, ads_cost, ads_roas, cost_per_attributed_session)
- get_realtime_data: See active users in the last 30 minutes with page, country, and device breakdowns.
- get_available_fields: Discover available tables and columns in the dataset.

Important rules:
- Return ONLY clean HTML with inline styles. No markdown, no code fences, no explanation outside the HTML.
- Format large numbers with commas.
- Keep the report concise and scannable — this goes in an email body.
- Use the tools to fetch real data before writing the report.
- Every report must follow this structure: a short overview paragraph, data presented in tables, an "Observations" section with bullet points, and a "Recommendations" section with bullet points.
- Use <h3> for section headings. Do NOT use <h1> or <h2>.
- Follow the detailed styling rules in the user prompt exactly.`;
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

  const dateColumn =
    table === "traffic_sources" || table === "sessions" ? "session_date" :
    table.startsWith("ads_") ? "_DATA_DATE" :
    table === "pageviews" || table === "conversions" || table === "stg_events" ? "event_date" :
    table === "users" ? "DATE(last_seen)" : "event_date";

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

async function executeBigQueryTool(
  toolUse: { name: string; input: Record<string, unknown> },
  propertyId: string
): Promise<{ result: unknown; isError: boolean }> {
  try {
    switch (toolUse.name) {
      case "query_analytics": {
        const input = toolUse.input as unknown as QueryAnalyticsInput;
        const { sql, params } = buildAnalyticsSQL(input);
        return { result: await runPropertyQuery(propertyId, sql, params), isError: false };
      }
      case "get_realtime_data":
        return { result: await queryRealtimeData(propertyId), isError: false };
      case "get_available_fields":
        return { result: await getPropertySchema(propertyId), isError: false };
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
 * @param accessToken   - Google OAuth access token (required for GA4 path, ignored for BigQuery)
 * @param propertyId    - GA4 property ID
 * @param alertType     - Key from ALERT_TYPES (e.g. "weekly_snapshot" or "custom")
 * @param frequency     - e.g. "daily" | "weekly" | "monthly" (used for context in the prompt)
 * @param customPrompt  - User-defined prompt text (required when alertType is "custom")
 * @param usesBigQuery  - Whether to use BigQuery path instead of GA4 API
 * @returns The generated HTML string for the email body
 */
export async function generateAlertContent(
  accessToken: string,
  propertyId: string,
  alertType: string,
  frequency: string,
  customPrompt?: string | null,
  usesBigQuery: boolean = false
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

  const userPrompt = `${promptText}\n\nThis is a ${frequency} report. The GA4 property ID is ${propertyId}.`;

  const systemPrompt = usesBigQuery ? getBigQueryAlertSystemPrompt() : GA4_ALERT_SYSTEM_PROMPT;
  const tools = usesBigQuery ? BIGQUERY_TOOLS : GA4_TOOLS;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  const anthropic = getAnthropic();

  console.log(`[alert-content] Starting generation for property ${propertyId}, type=${alertType}, freq=${frequency}, bigquery=${usesBigQuery}`);

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    tools,
    messages,
  });

  // Agentic tool-use loop — accumulate full conversation across rounds
  let round = 0;
  while (response.stop_reason === "tool_use") {
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
        ? await executeBigQueryTool(toolUse, propertyId)
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

  // Extract the final text
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textBlocks.map((b) => b.text).join("\n").trim();
}
