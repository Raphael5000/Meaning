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

Connected data sources: ${connectedSources.join(", ") || "none"}
${connectedSources.includes("GA4_BIGQUERY") ? "- GA4: sessions, pageviews, users, traffic_sources, conversions" : ""}
${connectedSources.includes("GOOGLE_ADS") ? "- Google Ads: campaign_performance (impressions, clicks, cost, conversions, ctr, cpc)" : ""}
${connectedSources.includes("SEARCH_CONSOLE") ? "- Search Console: search_performance (impressions, clicks, ctr, position)" : ""}
${connectedSources.includes("LINKEDIN") ? "- LinkedIn: post_performance (impressions, likes, comments, shares), follower_stats" : ""}
${connectedSources.includes("MAILCHIMP") ? "- Mailchimp: campaign_reports, audience_stats" : ""}
${connectedSources.includes("MICROSOFT_ADS") ? "- Microsoft Ads: msads_campaign_performance" : ""}

Goals: ${kpis.map((k) => `${k.name} (current: ${k.cachedValue}, target: ${k.targetValue})`).join(", ") || "none"}

Manual metrics: ${manualMetrics.map((m) => `${m.name} (entries: ${m.entries.map((e) => `${e.period}=${e.value}`).join(", ")})`).join("; ") || "none"}

Always-available placeholders: {{orgName}}, {{period}}, {{currency}}, {{goals_html}}, {{insights}}
`;

    const systemPrompt = `You are an expert report designer. You create beautiful, data-dense report slides as HTML/CSS.

RULES:
1. Output ONLY the inner HTML for a single slide (no <html>, <head>, <body> tags — just the content that goes inside a 1280x720px container).
2. The slide will be rendered inside a container with: width 1280px, height 720px, padding 48px 56px, background #0A0A0A, font-family system sans-serif, color white.
3. Use inline styles OR these pre-defined classes: .text-muted, .text-green, .text-red, .text-amber, .bg-surface, .border-subtle, .rounded, .tabular, .card, .progress-bar, .progress-fill, .branding
4. Use {{placeholder}} syntax for dynamic data. Return a JSON array of data bindings alongside the HTML.
5. For BigQuery data, write the SQL query as the binding value (use {dataset}.tableName, @startDate, @endDate params).
6. Design must be BEAUTIFUL — modern, editorial, data-dense. Match the reference image style if provided.
7. Dark theme: bg #0A0A0A, surface #141414, border #2A2A2A, text white, muted #888888, green #00A352, red #EF4444, amber #F59E0B.

Respond with ONLY a JSON object:
{
  "title": "Slide title",
  "htmlTemplate": "<div>...the HTML...</div>",
  "dataBindings": [
    {"placeholder": "metric_value", "source": "bigquery", "value": "SELECT COUNT(*) as value FROM {dataset}.sessions WHERE session_date >= @startDate AND session_date <= @endDate"},
    {"placeholder": "leads_count", "source": "manual", "value": "Website Leads"},
    {"placeholder": "orgName", "source": "org", "value": "name"}
  ]
}

No markdown fences. No explanation. Just the JSON.`;

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
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the JSON response (strip markdown fences if present)
    const raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const slideData = JSON.parse(raw) as {
      title: string;
      htmlTemplate: string;
      dataBindings: { placeholder: string; source: string; value: string }[];
    };

    return NextResponse.json(slideData);
  } catch (err) {
    console.error("[api/reports/generate-slide] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate slide", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
