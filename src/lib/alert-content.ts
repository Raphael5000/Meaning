import Anthropic from "@anthropic-ai/sdk";
import { runReport, runRealtimeReport, getMetadata } from "@/lib/ga4";
import { GA4_TOOLS } from "@/lib/tools";
import { ALERT_TYPES } from "@/lib/alert-prompts";

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

const SYSTEM_PROMPT = `You are a Google Analytics expert that generates concise, professional email reports. You query GA4 data using the provided tools and return a well-formatted HTML summary.

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
- Use the tools to fetch real data before writing the report.`;

/**
 * Generate alert email content by running the prompt against the user's GA4 property.
 *
 * @param accessToken - Google OAuth access token for the alert owner
 * @param propertyId  - GA4 property ID
 * @param alertType   - Key from ALERT_TYPES (e.g. "weekly_snapshot")
 * @param frequency   - "daily" | "weekly" | "monthly" (used for context in the prompt)
 * @returns The generated HTML string for the email body
 */
export async function generateAlertContent(
  accessToken: string,
  propertyId: string,
  alertType: string,
  frequency: string
): Promise<string> {
  const typeDefinition = ALERT_TYPES[alertType];
  if (!typeDefinition) {
    throw new Error(`Unknown alert type: ${alertType}`);
  }

  const userPrompt = `${typeDefinition.prompt}\n\nThis is a ${frequency} report. The GA4 property ID is ${propertyId}.`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  const anthropic = getAnthropic();

  console.log(`[alert-content] Starting generation for property ${propertyId}, type=${alertType}, freq=${frequency}`);

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: GA4_TOOLS,
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
              orderBys?: {
                field: string;
                direction?: "ASCENDING" | "DESCENDING";
                type?: "metric" | "dimension";
              }[];
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
            const metadata = await getMetadata(accessToken, propertyId);
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
          error instanceof Error ? error.message : "Tool execution failed";
        console.error(`[alert-content] Tool ${toolUse.name} failed:`, message);
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

    // Append tool results as a user turn and continue
    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: GA4_TOOLS,
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
