import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { runReport, runRealtimeReport, getMetadata } from "@/lib/ga4";
import { runPropertyQuery, queryRealtimeData, getPropertySchema } from "@/lib/bigquery";
import { GA4_TOOLS, BIGQUERY_TOOLS } from "@/lib/tools";
import { hasActiveSubscription } from "@/lib/subscription";
import { getGoogleAccessToken } from "@/lib/google-token";
import { getAllowedPropertyIds } from "@/lib/team-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic();

/** Regex to match the suggested questions JSON block at end of response */
const SUGGESTED_QUESTIONS_REGEX = /\s*```json\s*([\s\S]*)\s*```\s*$/;

/** Regex to match scorecard block: [[scorecard]]VALUE|LABEL[[/scorecard]] or [[scorecard]]VALUE|LABEL|CHANGE[[/scorecard]] (change = comparison delta, e.g. +1,234 or -5%) */
const SCORECARD_REGEX =
  /\[\[scorecard\]\]([^|[\]]+)\|([^|]*?)(?:\|([+-][^|[\]]*))?\[\[\/scorecard\]\]\s*\n?/i;

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
8. If you need to make ANY assumption to answer the question, you MUST explicitly state the assumption and ask the user for confirmation before proceeding. Never make silent assumptions.`;

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

const BIGQUERY_SYSTEM_PROMPT = `You are an analytics expert assistant. You help users understand their website analytics data by querying their BigQuery data warehouse and interpreting the results in clear, actionable language.

${SHARED_PROMPT_RULES}

When the user asks a question about their analytics:
1. Determine which tool(s) to call to answer their question.
2. Call the tool(s) with appropriate parameters.
3. Interpret the results in plain English with specific numbers, trends, and actionable insights. Every number must trace back to a tool result.
4. Use tables or lists when presenting data for clarity.

You have access to these tools:
- query_analytics: Query analytics data. Specify a table, metrics, dimensions, filters, date range, and ordering. Available tables and their key columns:
  - sessions: session_id, user_pseudo_id, session_start, session_duration, pageviews, is_bounce, landing_page, exit_page, source, medium, channel_group, device_category, country, city
  - pageviews: event_timestamp, user_pseudo_id, session_id, page_path, page_title, page_referrer, engagement_time_msec
  - users: user_pseudo_id, first_seen, last_seen, total_sessions, total_pageviews, acquisition_source, acquisition_medium, device_category, country
  - conversions: event_timestamp, user_pseudo_id, session_id, event_name, conversion_value, source, medium
  - traffic_sources: date, source, medium, channel_group, sessions, users, new_users, pageviews, bounce_rate, avg_session_duration
  - events: raw event data (event_timestamp, event_name, user_pseudo_id, event_params)
- get_realtime_data: See active users in the last 30 minutes with page, country, and device breakdowns.
- get_available_fields: Discover available tables and columns in the dataset.

${SHARED_PROMPT_OUTPUT}`;

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
      case "sessions": selectParts.push("COUNT(DISTINCT session_id) AS sessions"); break;
      case "users": selectParts.push("COUNT(DISTINCT user_pseudo_id) AS users"); break;
      case "pageviews": selectParts.push("SUM(pageviews) AS pageviews"); break;
      case "bounce_rate": selectParts.push("AVG(CASE WHEN is_bounce THEN 1.0 ELSE 0.0 END) AS bounce_rate"); break;
      case "avg_session_duration": selectParts.push("AVG(session_duration) AS avg_session_duration"); break;
      case "conversion_value": selectParts.push("SUM(conversion_value) AS conversion_value"); break;
      case "new_users": selectParts.push("SUM(new_users) AS new_users"); break;
      case "event_count": selectParts.push("COUNT(*) AS event_count"); break;
      default:
        // For traffic_sources table, metrics are pre-aggregated columns
        if (table === "traffic_sources") {
          selectParts.push(`SUM(${metric}) AS ${metric}`);
        } else {
          selectParts.push(metric);
        }
    }
  }

  const selectClause = selectParts.join(", ");

  // Build WHERE clause
  const whereParts: string[] = [];
  const params: Record<string, unknown> = {};

  // Date filtering
  const dateColumn = table === "traffic_sources" ? "date" :
    table === "sessions" ? "DATE(session_start)" :
    table === "pageviews" || table === "conversions" || table === "events" ? "DATE(event_timestamp)" :
    table === "users" ? "DATE(last_seen)" : "date";

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
  const orderByClause = orderBy ? `ORDER BY ${orderBy.field} ${orderBy.direction || "DESC"}` : "";
  const limitClause = `LIMIT ${Math.min(limit || 10, 500)}`;

  const sql = `SELECT ${selectClause} FROM \`{dataset}.${table}\` ${whereClause} ${groupByClause} ${orderByClause} ${limitClause}`;

  return { sql, params };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

async function getUsesBigQuery(propertyId: string, userId: string): Promise<boolean> {
  const dataSource = await prisma.dataSource.findFirst({
    where: { propertyId, userId, status: "ACTIVE", type: "GA4_BIGQUERY" },
    select: { id: true },
  });
  return !!dataSource;
}

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

  const { messages, propertyId } = (await request.json()) as {
    messages: ChatMessage[];
    propertyId: string;
  };

  if (!propertyId) {
    return NextResponse.json(
      { error: "No GA4 property selected" },
      { status: 400 }
    );
  }

  // Validate property access for team members
  if (userId) {
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
  const usesBigQuery = userId ? await getUsesBigQuery(propertyId, userId) : false;
  const systemPrompt = usesBigQuery ? BIGQUERY_SYSTEM_PROMPT : GA4_SYSTEM_PROMPT;
  const tools = usesBigQuery ? BIGQUERY_TOOLS : GA4_TOOLS;

  try {
    // Convert chat messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Run the agentic loop: Claude may call tools multiple times
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: anthropicMessages,
    });

    // Agentic tool-use loop
    while (response.stop_reason === "tool_use") {
      const assistantContent = response.content;
      const toolUseBlocks = assistantContent.filter(
        (block): block is Anthropic.ContentBlockParam & { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
          block.type === "tool_use"
      );

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
                result = await runPropertyQuery(propertyId, sql, params);
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
          const message =
            error instanceof Error
              ? error.message
              : "Tool execution failed";
          result = { error: message };
          isError = true;
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
          is_error: isError,
        });
      }

      // Continue the conversation with tool results
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: [
          ...anthropicMessages,
          { role: "assistant", content: assistantContent },
          { role: "user", content: toolResults },
        ],
      });
    }

    // Extract the final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    let rawMessage = textBlocks.map((b) => b.text).join("\n");

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

    return NextResponse.json({
      message: rawMessage.trim(),
      scorecard: scorecard ?? undefined,
      chart: chart ?? undefined,
      suggestedQuestions: suggestedQuestions ?? undefined,
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message =
      error instanceof Error ? error.message : "Chat request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
