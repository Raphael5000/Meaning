import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runPropertyQuery, queryRealtimeData, getPropertySchema } from "@/lib/bigquery";
import { BIGQUERY_TOOLS } from "@/lib/tools";
import { getOrgDataSources } from "@/lib/org-access";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic();

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

function getWidgetSystemPrompt(hasAds: boolean, hasLinkedIn: boolean, hasMailchimp: boolean, hasGsc: boolean, hasMsAds: boolean): string {
  const today = new Date().toISOString().split("T")[0];

  const adsTables = hasAds ? "\n  - campaign_performance, keyword_performance, click_attribution, account_info (Google Ads)" : "";
  const linkedInTables = hasLinkedIn ? "\n  - post_performance, follower_stats, follower_demographics, page_stats, org_info (LinkedIn)" : "";
  const mailchimpTables = hasMailchimp ? "\n  - campaign_reports, audience_stats, audience_growth, mc_account_info (Mailchimp)" : "";
  const gscTables = hasGsc ? "\n  - search_performance, url_inspection, site_info (Google Search Console)" : "";
  const msAdsTables = hasMsAds ? "\n  - msads_campaign_performance, msads_keyword_performance, msads_search_query_performance, msads_account_info (Microsoft/Bing Ads — use run_microsoft_ads_query tool)" : "";

  return `You are a data visualization assistant. Your job is to generate a single dashboard widget from a user's natural language request.

Today's date is ${today}.

CRITICAL RULES:
1. THINK before querying. Interpret the user's intent — e.g. "top blog posts" means filter for pages with /blog/ in the URL path, "landing pages" means the first page in a session, "product pages" means pages with /product/ in the path. Use your knowledge of common website URL patterns to build smart filters.
2. You can call multiple tools (up to 4 rounds). If you need to explore the data first (e.g. check what URL patterns exist, sample page titles, discover categories), call get_available_fields or run a small exploratory query first, THEN build your final query with the right filters.
3. For filtering by page type (blog, product, etc.), use LIKE filters on page_location: WHERE page_location LIKE '%/blog/%' for blog posts. Always use the path pattern, not page_title.
4. NEVER fabricate data. Only use numbers from the tool response.
5. Default date range is last 28 days unless specified.
6. Use the run_ads_query tool for any query that needs LIKE filters, JOINs, subqueries, or complex SQL — query_analytics is only for simple aggregations.

Available tables and their columns:
  - sessions: session_date, user_pseudo_id, ga_session_id, session_duration_seconds, pageviews, is_bounce, landing_page, exit_page, session_source, session_medium, session_default_channel_group, device_category, geo_country, geo_city, is_first_visit
  - pageviews: event_date, user_pseudo_id, ga_session_id, event_timestamp, page_location, page_title, session_source, session_medium, device_category, geo_country
  - users: first_seen, last_seen, total_sessions, total_pageviews, acquisition_source, acquisition_medium, device_category, geo_country, is_new_user
  - traffic_sources: session_date, source, medium, channel_group, sessions, users, new_users, pageviews, bounce_rate
  - conversions: event_date, event_name, page_location, session_source, session_medium, geo_country
  - stg_events: event_date, event_timestamp, event_name, user_pseudo_id, ga_session_id, page_location, session_source, session_medium${adsTables}${msAdsTables}${linkedInTables}${mailchimpTables}${gscTables}

IMPORTANT column notes:
- traffic_sources uses "source" and "medium". sessions/pageviews use "session_source" and "session_medium". Do NOT mix them.
- For page flow / sankey diagrams, use pageviews table with page_location, ga_session_id, event_timestamp, session_source, session_medium. Sankey nodes MUST be unique — prefix each layer (e.g. "google / organic" for sources, "Page 1: /path" for landing pages, "Page 2: /path" for second pages). For source→page flows, UNION two layers: source→landing page and landing page→second page. Columns must be from_node, to_node, transitions.
- For Google Ads: date column is stats_date. cost is already in currency units.
- For LinkedIn: date column is post_date or stats_date.
- For Mailchimp: date column is send_date or stats_date.
- For GSC: date column is query_date. ctr is 0-1 decimal. position: lower is better.
- For Microsoft Ads: use run_microsoft_ads_query tool. Tables are prefixed msads_ (msads_campaign_performance, msads_keyword_performance, msads_search_query_performance, msads_account_info). Date column is stats_date. cost is in currency units. Use {dataset}.tableName format.

RESPONSE FORMAT:
You MUST respond with exactly ONE of these formats:

For CHART widgets — wrap an ECharts option JSON in [[chart]]...[[/chart]]:
[[chart]]{"title":{"text":"..."},"xAxis":{"data":[...]},"series":[...]}[[/chart]]

For SCORECARD widgets — use [[scorecard]]VALUE|LABEL|CHANGE[[/scorecard]]:
[[scorecard]]12,847|Total Users|+12.3%[[/scorecard]]
The CHANGE is optional but recommended — it shows a comparison vs the previous period (e.g. +12.3%, -5%, +1,234). Include it whenever you can compute a period-over-period comparison. Use + prefix for positive change, - for negative.

For TABLE widgets — respond with [[table]]...[[/table]] containing a JSON array:
[[table]][{"column1":"value1","column2":123},...][[/table]]

Do NOT include any explanatory text. ONLY output the widget block.`;
}

// ---------------------------------------------------------------------------
// Parse widget response
// ---------------------------------------------------------------------------

const CHART_REGEX = /\[\[chart\]\]([\s\S]*?)\[\[\/chart\]\]/i;
const SCORECARD_REGEX = /\[\[scorecard\]\]([^|[\]]+)\|([^|[\]]+)(?:\|([+-][^|[\]]*))?\[\[\/scorecard\]\]/i;
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

  // Try scorecard
  const scorecardMatch = text.match(SCORECARD_REGEX);
  if (scorecardMatch) {
    return {
      widgetType: "scorecard",
      displayConfig: { label: scorecardMatch[2].trim(), value: scorecardMatch[1].trim(), change: scorecardMatch[3]?.trim() || undefined },
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
  const body = (await request.json()) as { prompt: string };

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

    // Resolve data sources from the org
    const orgDataSources = await getOrgDataSources(dashboard.orgId);
    const ga4Ds = orgDataSources.find((ds) => ds.type === "GA4_BIGQUERY" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"));
    const propertyId = ga4Ds?.propertyId ?? "";

    const adsCustomerId = orgDataSources.find((ds) => ds.type === "GOOGLE_ADS" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"))?.adsCustomerId ?? null;
    const linkedInOrgId = orgDataSources.find((ds) => ds.type === "LINKEDIN" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"))?.propertyId ?? null;
    const mailchimpListId = orgDataSources.find((ds) => ds.type === "MAILCHIMP" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"))?.propertyId ?? null;
    const gscSiteUrl = orgDataSources.find((ds) => ds.type === "SEARCH_CONSOLE" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"))?.propertyId ?? null;
    const msAdsAccountId = orgDataSources.find((ds) => ds.type === "MICROSOFT_ADS" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"))?.propertyId ?? null;

    const systemPrompt = getWidgetSystemPrompt(!!adsCustomerId, !!linkedInOrgId, !!mailchimpListId, !!gscSiteUrl, !!msAdsAccountId);

    // Call Claude with tools
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: BIGQUERY_TOOLS,
      messages: [{ role: "user", content: body.prompt }],
    });

    // Tool execution loop (max 2 rounds for widgets)
    const conversationMessages: Anthropic.MessageParam[] = [{ role: "user", content: body.prompt }];
    let toolRound = 0;
    let capturedQueryConfig: { tool: string; input: unknown } | null = null;
    let capturedData: unknown = null;

    while (response.stop_reason === "tool_use" && toolRound < 4) {
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
            case "run_microsoft_ads_query": {
              const input = toolUse.input as { sql: string };
              result = await runPropertyQuery(propertyId, input.sql, undefined, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId);
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: BIGQUERY_TOOLS,
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
        model: "claude-sonnet-4-20250514",
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
      console.error("[widget-gen] Failed to parse widget from response:", rawText.slice(0, 300));
      return NextResponse.json(
        { error: "Failed to generate widget. Please try rephrasing your request.", raw: rawText.slice(0, 200) },
        { status: 422 }
      );
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
    const sizes: Record<string, { w: number; h: number }> = {
      chart: { w: 6, h: 5 },
      scorecard: { w: 3, h: 3 },
      table: { w: 6, h: 4 },
    };
    const size = sizes[parsed.widgetType] || sizes.chart;
    const maxBottom = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

    layout.push({ i: widget.id, x: 0, y: maxBottom, w: size.w, h: size.h });

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
