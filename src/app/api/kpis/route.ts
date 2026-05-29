import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { executeKpi } from "@/lib/kpi-executor";
import { getOrgDataSources } from "@/lib/org-access";

export const dynamic = "force-dynamic";

const VALID_DIRECTIONS = new Set(["above", "below"]);
const VALID_PERIODS = new Set(["daily", "weekly", "monthly"]);
const VALID_FORMATS = new Set(["number", "percentage", "currency"]);

/** GET /api/kpis – list all KPIs for the user's active org */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrgId: true },
    });
    const orgId = me?.activeOrgId;
    if (!orgId) {
      return NextResponse.json([]);
    }

    const kpis = await prisma.kpi.findMany({
      where: { orgId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(kpis);
  } catch (err) {
    console.error("[api/kpis] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch KPIs" },
      { status: 500 }
    );
  }
}

/** POST /api/kpis – create a new KPI with AI-generated SQL */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name: string;
    metricDescription?: string;
    targetValue: number;
    targetDirection?: string;
    timePeriod?: string;
    displayFormat?: string;
    manualMetricId?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!body.metricDescription?.trim()) {
    return NextResponse.json(
      { error: "Metric description is required" },
      { status: 400 }
    );
  }
  if (typeof body.targetValue !== "number" || isNaN(body.targetValue)) {
    return NextResponse.json(
      { error: "Target value must be a number" },
      { status: 400 }
    );
  }

  const targetDirection = body.targetDirection || "above";
  if (!VALID_DIRECTIONS.has(targetDirection)) {
    return NextResponse.json(
      { error: "targetDirection must be 'above' or 'below'" },
      { status: 400 }
    );
  }

  const timePeriod = body.timePeriod || "monthly";
  if (!VALID_PERIODS.has(timePeriod)) {
    return NextResponse.json(
      { error: "timePeriod must be 'daily', 'weekly', or 'monthly'" },
      { status: 400 }
    );
  }

  const displayFormat = body.displayFormat || "number";
  if (!VALID_FORMATS.has(displayFormat)) {
    return NextResponse.json(
      { error: "displayFormat must be 'number', 'percentage', or 'currency'" },
      { status: 400 }
    );
  }

  // Resolve orgId
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeOrgId: true },
  });
  const orgId = me?.activeOrgId;
  if (!orgId) {
    return NextResponse.json(
      { error: "No active organization" },
      { status: 400 }
    );
  }

  try {
    // Get max sortOrder for this org
    const maxSort = await prisma.kpi.aggregate({
      where: { orgId },
      _max: { sortOrder: true },
    });

    // Decide data source: ask Claude to look at available manual metrics
    // AND connected data sources and determine the best match.
    const manualMetrics = await prisma.manualMetric.findMany({
      where: { orgId },
      include: { entries: { orderBy: { period: "desc" }, take: 3 } },
    });
    const orgDataSources = await getOrgDataSources(orgId);
    const connectedStatuses = ["ACTIVE", "BACKFILLING", "ERROR"];
    const connectedSources = orgDataSources
      .filter((ds) => connectedStatuses.includes(ds.status))
      .map((ds) => ds.type);

    let matchedManualId: string | null = null;

    if (manualMetrics.length > 0) {
      const anthropic = new Anthropic();
      const routingResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20250514",
        max_tokens: 200,
        system: `You decide whether a KPI goal should be tracked from a MANUAL metric (user-entered data) or from CONNECTED data sources (BigQuery analytics).

Rules:
- Only match to a manual metric if the goal is clearly about the SAME thing the manual metric tracks.
- "website views" or "sessions" is analytics data from GA4, NOT manual leads data.
- "leads from Meta" matches a manual metric called "Meta Leads" — same concept.
- If unsure, choose CONNECTED.

Respond with ONLY a JSON object: {"source": "manual", "metricId": "..."} or {"source": "connected"}
No explanation.`,
        messages: [{
          role: "user",
          content: `Goal name: "${body.name}"
Goal description: "${body.metricDescription}"

Manual metrics available:
${manualMetrics.map((m) => `- id: ${m.id}, name: "${m.name}", recent entries: ${m.entries.map((e) => `${e.period}=${e.value}`).join(", ") || "none"}`).join("\n")}

Connected data sources: ${connectedSources.length > 0 ? connectedSources.join(", ") : "none"}

Which source should this goal use?`,
        }],
      });

      const textBlock = routingResponse.content.find((b) => b.type === "text");
      if (textBlock) {
        try {
          const decision = JSON.parse(textBlock.text.trim()) as { source: string; metricId?: string };
          if (decision.source === "manual" && decision.metricId) {
            // Verify the metric exists and belongs to this org
            const validMetric = manualMetrics.find((m) => m.id === decision.metricId);
            if (validMetric) matchedManualId = decision.metricId;
          }
        } catch {
          // Parse failed — fall through to BigQuery
          console.warn("[api/kpis] Could not parse routing decision, falling through to BigQuery");
        }
      }
    }

    if (matchedManualId) {
      const latestEntry = await prisma.manualMetricEntry.findFirst({
        where: { metricId: matchedManualId },
        orderBy: { period: "desc" },
      });
      const kpi = await prisma.kpi.create({
        data: {
          orgId,
          name: body.name.trim(),
          metricQuery: "",
          dataSourceType: "MANUAL",
          targetValue: body.targetValue,
          targetDirection,
          timePeriod,
          displayFormat,
          manualMetricId: matchedManualId,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          cachedValue: latestEntry?.value ?? null,
          cachedAt: latestEntry ? new Date() : null,
        },
      });
      return NextResponse.json(kpi, { status: 201 });
    }

    // No manual metric match — generate SQL from the natural language description using Claude
    const anthropic = new Anthropic();
    const sqlResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are a BigQuery SQL expert. Generate a single BigQuery SQL query that returns exactly ONE numeric value for the given metric description.

Available tables (use {dataset}.tableName format):
- {dataset}.sessions: session_date, user_pseudo_id, ga_session_id, session_duration_seconds, pageviews, is_bounce, is_engaged, landing_page, session_source, session_medium, session_default_channel_group, device_category, geo_country
- {dataset}.pageviews: event_date, page_location, page_title, user_pseudo_id, ga_session_id
- {dataset}.users: user_pseudo_id, first_seen, last_seen, total_sessions, total_pageviews, bounce_rate
- {dataset}.conversions: event_date, event_name, user_pseudo_id
- {dataset}.traffic_sources: session_date, source, medium, channel_group, sessions, users, pageviews, bounce_rate

Use @startDate and @endDate as date parameters — the system will fill these based on the time period.
Return ONLY the SQL query, no explanation, no markdown fences.`,
      messages: [
        {
          role: "user",
          content: `Generate a BigQuery SQL query that returns a single numeric value for: "${body.metricDescription}"

The query should return one row with one column named "value".
Time period: ${timePeriod}
Format: ${displayFormat}`,
        },
      ],
    });

    const textBlock = sqlResponse.content.find((b) => b.type === "text");
    const metricQuery = textBlock
      ? textBlock.text
          .trim()
          .replace(/^```sql\s*/i, "")
          .replace(/```\s*$/, "")
          .trim()
      : "";

    if (!metricQuery) {
      return NextResponse.json(
        { error: "Failed to generate SQL query" },
        { status: 500 }
      );
    }

    const kpi = await prisma.kpi.create({
      data: {
        orgId,
        name: body.name.trim(),
        metricQuery,
        targetValue: body.targetValue,
        targetDirection,
        timePeriod,
        displayFormat,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    // Auto-execute the KPI query to populate cachedValue immediately
    const ga4Ds = orgDataSources.find(
      (ds) => ds.type === "GA4_BIGQUERY" && connectedStatuses.includes(ds.status)
    );
    if (ga4Ds) {
      executeKpi(kpi, {
        propertyId: ga4Ds.propertyId,
        adsCustomerId:
          orgDataSources.find(
            (ds) => ds.type === "GOOGLE_ADS" && connectedStatuses.includes(ds.status)
          )?.adsCustomerId ?? null,
        linkedInOrgId:
          orgDataSources.find(
            (ds) => ds.type === "LINKEDIN" && connectedStatuses.includes(ds.status)
          )?.propertyId ?? null,
        mailchimpListId:
          orgDataSources.find(
            (ds) => ds.type === "MAILCHIMP" && connectedStatuses.includes(ds.status)
          )?.propertyId ?? null,
        gscSiteUrl:
          orgDataSources.find(
            (ds) => ds.type === "SEARCH_CONSOLE" && connectedStatuses.includes(ds.status)
          )?.propertyId ?? null,
        msAdsAccountId:
          orgDataSources.find(
            (ds) => ds.type === "MICROSOFT_ADS" && connectedStatuses.includes(ds.status)
          )?.propertyId ?? null,
      }).catch((err) => {
        console.error(`[api/kpis] Auto-execute failed for KPI ${kpi.id}:`, err);
      });
    }

    return NextResponse.json(kpi, { status: 201 });
  } catch (err) {
    console.error("[api/kpis] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create KPI" },
      { status: 500 }
    );
  }
}
