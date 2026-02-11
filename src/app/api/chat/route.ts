import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { runReport, runRealtimeReport, getMetadata } from "@/lib/ga4";
import { GA4_TOOLS } from "@/lib/tools";
import { hasActiveSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic();

/** Regex to match the suggested questions JSON block at end of response */
const SUGGESTED_QUESTIONS_REGEX = /\s*```json\s*([\s\S]*)\s*```\s*$/;

/** Regex to match scorecard block at start: [[scorecard]]VALUE|LABEL[[/scorecard]] */
const SCORECARD_REGEX = /^\s*\[\[scorecard\]\]([^|[\]]+)\|([\s\S]*?)\[\[\/scorecard\]\]\s*\n?/i;

function parseScorecard(text: string): { value: string; label: string } | null {
  const match = text.match(SCORECARD_REGEX);
  if (!match) return null;
  return { value: match[1].trim(), label: (match[2] || "").trim() || "Result" };
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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are a Google Analytics expert assistant. You help users understand their website analytics data by querying their GA4 property and interpreting the results in clear, actionable language.

When the user asks a question about their analytics:
1. Determine which GA4 tool(s) to call to answer their question.
2. Call the tool(s) with appropriate parameters.
3. Interpret the results in plain English with specific numbers, trends, and actionable insights.
4. Use tables or lists when presenting data for clarity.

You have access to these tools:
- run_report: Query historical GA4 data with metrics, dimensions, date ranges, and sorting.
- run_realtime_report: See real-time data from the last 30 minutes.
- get_metadata: Discover available metrics and dimensions.

Common metrics: activeUsers, sessions, screenPageViews, bounceRate, averageSessionDuration, totalRevenue, conversions, engagementRate, eventCount, newUsers
Common dimensions: date, country, city, source, medium, pagePath, deviceCategory, sessionDefaultChannelGroup, eventName, browser, operatingSystem

Tips:
- Default date range is the last 28 days unless the user specifies otherwise.
- For trend analysis, use the "date" dimension.
- For traffic source analysis, use "sessionDefaultChannelGroup", "source", or "medium" dimensions.
- For geographic analysis, use "country" or "city" dimensions.
- Always provide context and interpretation, not just raw numbers.
- When comparing periods, run two reports with different date ranges.
- Format large numbers with commas for readability.
- When providing recommendations or actionable advice, wrap them in [[rec]]...[[/rec]] blocks. Each recommendation can be its own block, e.g. [[rec]]Focus on improving your top 3 landing pages — they drive 60% of conversions.[[/rec]] This will render them as green bubbles with a tick icon.

- When the user asks for a specific number or metric (e.g. "how many users visited my site this week?", "what was my revenue?", "how many sessions?"), start your response with a scorecard so the number appears first. Use exactly this format on the first line: [[scorecard]]VALUE|LABEL[[/scorecard]] where VALUE is the main number (use commas for thousands, e.g. 12,847) and LABEL is a short description (e.g. "Users this week" or "Sessions"). Then add a blank line, then write your full explanation as usual. Example: [[scorecard]]12,847|Users this week[[/scorecard]]

Then your full answer with context and interpretation.

At the end of every response, append a JSON block with 3-4 suggested follow-up questions the user might ask next. Format it exactly as:
\`\`\`json
{"suggestedQuestions": ["Question 1?", "Question 2?", "Question 3?"]}
\`\`\`
Do not include this block in your main answer. Your main answer should end before this block. Use questions relevant to the analytics data you just discussed.`;

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check subscription
  if (session.userId) {
    const active = await hasActiveSubscription(session.userId);
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

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: "No messages provided" },
      { status: 400 }
    );
  }

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
      system: SYSTEM_PROMPT,
      tools: GA4_TOOLS,
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
              result = await runReport(session.accessToken!, {
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
              result = await runRealtimeReport(session.accessToken!, {
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
                session.accessToken!,
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
        system: SYSTEM_PROMPT,
        tools: GA4_TOOLS,
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

    // Parse suggested follow-up questions from JSON block at end
    const suggestedQuestions = parseSuggestedQuestions(rawMessage);
    if (suggestedQuestions) {
      rawMessage = stripSuggestedQuestionsBlock(rawMessage);
    }

    return NextResponse.json({
      message: rawMessage.trim(),
      scorecard: scorecard ?? undefined,
      suggestedQuestions: suggestedQuestions ?? undefined,
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message =
      error instanceof Error ? error.message : "Chat request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
