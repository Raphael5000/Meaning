import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrgDataSources } from "@/lib/org-access";

export const dynamic = "force-dynamic";

/**
 * POST /api/reports/generate-slide
 *
 * Takes a reference image (base64) OR a text prompt, plus context about
 * available data sources, and returns an HTML/CSS slide template with
 * {{placeholder}} bindings.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json()) as {
    referenceImage?: string; // base64 data URL
    prompt?: string;
  };

  if (!body.referenceImage && !body.prompt) {
    return NextResponse.json({ error: "Provide a reference image or a prompt" }, { status: 400 });
  }

  try {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { activeOrgId: true } });
    const orgId = me?.activeOrgId;
    if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 400 });

    // Gather context about available data
    const [org, kpis, manualMetrics, orgDataSources] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, displayCurrency: true } }),
      prisma.kpi.findMany({ where: { orgId }, select: { name: true, cachedValue: true, targetValue: true, displayFormat: true } }),
      prisma.manualMetric.findMany({ where: { orgId }, include: { entries: { orderBy: { period: "desc" }, take: 3 } } }),
      getOrgDataSources(orgId),
    ]);

    const connectedStatuses = ["ACTIVE", "BACKFILLING", "ERROR"];
    const connectedSources = orgDataSources
      .filter((ds) => connectedStatuses.includes(ds.status))
      .map((ds) => ds.type);

    const dataContext = `
Available data for ${org?.name ?? "this organization"} (currency: ${org?.displayCurrency ?? "USD"}):

BIGQUERY TABLES (use EXACTLY these names with {dataset}.tableName):
${connectedSources.includes("GA4_BIGQUERY") ? `- {dataset}.sessions: session_date, user_pseudo_id, ga_session_id, session_duration_seconds, pageviews, is_bounce, landing_page, session_source, session_medium, device_category, geo_country
- {dataset}.pageviews: event_date, page_location, page_title, user_pseudo_id
- {dataset}.users: user_pseudo_id, first_seen, last_seen, total_sessions, total_pageviews
- {dataset}.traffic_sources: session_date, source, medium, channel_group, sessions, users, pageviews, bounce_rate
- {dataset}.conversions: event_date, event_name, user_pseudo_id` : ""}
${connectedSources.includes("GOOGLE_ADS") ? `- {dataset}.campaign_performance: stats_date, campaign_id, campaign_name, impressions, clicks, cost, conversions, conversions_value` : ""}
${connectedSources.includes("SEARCH_CONSOLE") ? `- {dataset}.search_performance: query_date, query, page, impressions, clicks, ctr, position` : ""}
${connectedSources.includes("LINKEDIN") ? `- {dataset}.post_performance: published_date, post_urn, impressions, clicks, likes, comments, shares, engagements
- {dataset}.follower_stats: stats_date, total_followers` : ""}
${connectedSources.includes("MICROSOFT_ADS") ? `- {dataset}.msads_campaign_performance: stats_date, campaign_name, impressions, clicks, cost, conversions` : ""}

Goals: ${kpis.map((k) => `${k.name} (current: ${k.cachedValue}, target: ${k.targetValue})`).join(", ") || "none"}

Manual metrics: ${manualMetrics.map((m) => `${m.name} (entries: ${m.entries.map((e) => `${e.period}=${e.value}`).join(", ")})`).join("; ") || "none"}

Always-available placeholders (auto-resolved, no binding needed): {{orgName}}, {{period}}, {{currency}}, {{goals_html}}, {{insights}}
`;

    const systemPrompt = `You are an expert report designer. You create beautiful, data-dense report slides as HTML/CSS.

RULES:
1. Output ONLY the inner HTML for a single slide (no <html>, <head>, <body> tags — just the content inside a 1280x720px container).
2. Container has: width 1280px, height 720px, padding 48px 56px, background #0A0A0A, font-family system sans-serif, color white.
3. Available classes: .text-muted, .text-green, .text-red, .text-amber, .bg-surface, .border-subtle, .rounded, .tabular, .card, .progress-bar, .progress-fill
4. Use {{placeholder}} syntax for dynamic data.
5. CRITICAL — MINIMIZE DATA BINDINGS. Use ONE SQL query that returns multiple columns instead of separate queries per value. Example: ONE query returning impressions, clicks, cost, ctr as columns, then bind each column to a placeholder. Maximum 5-8 bindings per slide.
6. For BigQuery: use EXACTLY the table names from the data context. Always use {dataset}.tableName format. Use @startDate and @endDate params for date filtering.
7. For tables with last month vs this month: use ONE query with CASE expressions to compute both periods in a single query, e.g.:
   SELECT SUM(CASE WHEN date >= @startDate THEN val ELSE 0 END) as current, SUM(CASE WHEN date >= @prevStartDate AND date < @startDate THEN val ELSE 0 END) as previous FROM ...
   Available params: @startDate, @endDate, @prevStartDate, @prevEndDate
8. Dark theme: bg #0A0A0A, surface #141414, border #2A2A2A, text white, muted #888, green #00A352, red #EF4444, amber #F59E0B.
9. Match the reference image layout as closely as possible if one is provided.

RESPONSE FORMAT — ONLY a JSON object, no markdown fences:
{
  "title": "Slide title",
  "htmlTemplate": "<div>...HTML...</div>",
  "dataBindings": [
    {"placeholder": "ads_data", "source": "bigquery", "value": "SELECT SUM(impressions) as impressions, SUM(clicks) as clicks, SAFE_DIVIDE(SUM(clicks),SUM(impressions)) as ctr, SUM(cost) as cost FROM {dataset}.campaign_performance WHERE stats_date >= @startDate AND stats_date <= @endDate"},
    {"placeholder": "leads", "source": "manual", "value": "Website Leads"},
    {"placeholder": "orgName", "source": "org", "value": "name"}
  ]
}

For bigquery bindings that return multiple columns, the placeholder will be resolved as a JSON object. In the HTML template, reference individual fields like {{ads_impressions}}, {{ads_clicks}} etc. — the system will flatten the first row's columns into separate placeholders by prepending the binding placeholder name + underscore.`;

    const anthropic = new Anthropic();
    const messages: Anthropic.MessageParam[] = [];

    if (body.referenceImage) {
      // Extract media type and base64 data
      const match = body.referenceImage.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
      }
      const mediaType = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      const imageData = match[2];

      messages.push({
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageData },
          },
          {
            type: "text",
            text: `Recreate this slide as HTML/CSS. Match the layout, structure, and data presentation as closely as possible. Use {{placeholder}} syntax for all dynamic values.${body.prompt ? `\n\nAdditional instructions: ${body.prompt}` : ""}\n\n${dataContext}`,
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `${body.prompt}\n\n${dataContext}`,
      });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the JSON response (strip markdown fences if present)
    let raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

    // Try to repair truncated JSON if needed
    let slideData: { title: string; htmlTemplate: string; dataBindings: { placeholder: string; source: string; value: string }[] };
    try {
      slideData = JSON.parse(raw);
    } catch {
      // Attempt to close truncated JSON
      console.warn("[generate-slide] JSON parse failed, attempting repair...");
      // Find if htmlTemplate string is unterminated
      if (!raw.endsWith("}")) {
        // Try closing the string and object
        raw = raw.replace(/,?\s*$/, "");
        if (!raw.includes('"dataBindings"')) {
          raw += '", "dataBindings": []}';
        } else {
          raw += "]}";
        }
      }
      try {
        slideData = JSON.parse(raw);
      } catch (e2) {
        console.error("[generate-slide] JSON repair also failed:", e2);
        return NextResponse.json({ error: "AI response was too large to parse. Try a simpler slide description." }, { status: 422 });
      }
    }

    return NextResponse.json(slideData);
  } catch (err) {
    console.error("[api/reports/generate-slide] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate slide", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
