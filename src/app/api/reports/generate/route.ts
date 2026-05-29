import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runPropertyQuery } from "@/lib/bigquery";
import { getOrgDataSources } from "@/lib/org-access";
import { generateReport, type ReportData } from "@/lib/report-engine";
import type { SlideDefinition, ChannelTableConfig, ScorecardRowConfig } from "@/lib/report-types";

export const dynamic = "force-dynamic";

/** POST /api/reports/generate — generate a .pptx from a template */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json()) as {
    templateId: string;
    period: string; // "YYYY-MM"
  };

  if (!body.templateId || !body.period) {
    return NextResponse.json({ error: "templateId and period required" }, { status: 400 });
  }

  try {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { activeOrgId: true } });
    const orgId = me?.activeOrgId;
    if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 400 });

    const [template, org] = await Promise.all([
      prisma.reportTemplate.findFirst({ where: { id: body.templateId, orgId } }),
      prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, displayCurrency: true } }),
    ]);

    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const slides = template.slides as unknown as SlideDefinition[];
    const displayCurrency = org?.displayCurrency ?? "USD";

    // Parse period
    const [year, month] = body.period.split("-").map(Number);
    const thisMonthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const thisMonthEnd = new Date(year, month, 0).toISOString().split("T")[0];
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const prevMonthEnd = new Date(prevYear, prevMonth, 0).toISOString().split("T")[0];

    const periodLabel = new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Gather org data sources
    const orgDataSources = await getOrgDataSources(orgId);
    const connectedStatuses = ["ACTIVE", "BACKFILLING", "ERROR"];
    const ga4Ds = orgDataSources.find((ds) => ds.type === "GA4_BIGQUERY" && connectedStatuses.includes(ds.status));
    const propertyId = ga4Ds?.propertyId ?? "";
    const adsCustomerId = orgDataSources.find((ds) => ds.type === "GOOGLE_ADS" && connectedStatuses.includes(ds.status))?.adsCustomerId ?? null;
    const linkedInOrgId = orgDataSources.find((ds) => ds.type === "LINKEDIN" && connectedStatuses.includes(ds.status))?.propertyId ?? null;
    const mailchimpListId = orgDataSources.find((ds) => ds.type === "MAILCHIMP" && connectedStatuses.includes(ds.status))?.propertyId ?? null;
    const gscSiteUrl = orgDataSources.find((ds) => ds.type === "SEARCH_CONSOLE" && connectedStatuses.includes(ds.status))?.propertyId ?? null;
    const msAdsAccountId = orgDataSources.find((ds) => ds.type === "MICROSOFT_ADS" && connectedStatuses.includes(ds.status))?.propertyId ?? null;

    // Helper to run BQ queries
    async function runQuery(sql: string, params?: Record<string, unknown>) {
      if (!propertyId) return [];
      try {
        const result = await runPropertyQuery(propertyId, sql, params, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId);
        return (result.rows || []) as Record<string, unknown>[];
      } catch (err) {
        console.error("[report-gen] Query failed:", err);
        return [];
      }
    }

    // Build report data
    const reportData: ReportData = {
      orgName: org?.name ?? "Report",
      period: periodLabel,
      displayCurrency,
      scorecards: {},
      channelData: {},
      goals: [],
      manualMetrics: [],
    };

    // Gather goals
    const kpis = await prisma.kpi.findMany({ where: { orgId }, orderBy: { sortOrder: "asc" } });
    reportData.goals = kpis.map((k) => ({
      name: k.name,
      value: k.cachedValue,
      target: k.targetValue,
      direction: k.targetDirection,
      displayFormat: k.displayFormat,
    }));

    // Gather manual metrics
    const manualMetrics = await prisma.manualMetric.findMany({
      where: { orgId },
      include: { entries: { orderBy: { period: "asc" } } },
    });
    reportData.manualMetrics = manualMetrics.map((m) => ({
      name: m.name,
      entries: m.entries.map((e) => ({ period: e.period, value: e.value })),
    }));

    // Gather channel data based on what slides need
    const channelSlides = slides.filter((s) => s.type === "channel-table" || s.type === "campaign-table");
    for (const s of channelSlides) {
      const config = s.config as ChannelTableConfig;
      const sourceType = config.sourceType;

      if (sourceType === "GOOGLE_ADS" && adsCustomerId) {
        const [current, previous] = await Promise.all([
          runQuery(`SELECT SUM(impressions) as impressions, SUM(clicks) as clicks, SAFE_DIVIDE(SUM(clicks), SUM(impressions)) as ctr, SAFE_DIVIDE(SUM(cost), SUM(clicks)) as cpc, SUM(cost) as cost, SUM(conversions) as conversions FROM \`{dataset}.campaign_performance\` WHERE stats_date >= @startDate AND stats_date <= @endDate`, { startDate: thisMonthStart, endDate: thisMonthEnd }),
          runQuery(`SELECT SUM(impressions) as impressions, SUM(clicks) as clicks, SAFE_DIVIDE(SUM(clicks), SUM(impressions)) as ctr, SAFE_DIVIDE(SUM(cost), SUM(clicks)) as cpc, SUM(cost) as cost, SUM(conversions) as conversions FROM \`{dataset}.campaign_performance\` WHERE stats_date >= @startDate AND stats_date <= @endDate`, { startDate: prevMonthStart, endDate: prevMonthEnd }),
        ]);
        const cur = current[0] || {};
        const prev = previous[0] || {};
        reportData.channelData["GOOGLE_ADS"] = {
          metrics: {
            Impressions: { current: Number(cur.impressions ?? 0), previous: Number(prev.impressions ?? 0), format: "number" },
            Clicks: { current: Number(cur.clicks ?? 0), previous: Number(prev.clicks ?? 0), format: "number" },
            CTR: { current: Number(cur.ctr ?? 0), previous: Number(prev.ctr ?? 0), format: "percentage" },
            CPC: { current: Number(cur.cpc ?? 0), previous: Number(prev.cpc ?? 0), format: "currency" },
            Cost: { current: Number(cur.cost ?? 0), previous: Number(prev.cost ?? 0), format: "currency" },
            Conversions: { current: Number(cur.conversions ?? 0), previous: Number(prev.conversions ?? 0), format: "number" },
          },
        };
      }

      if (sourceType === "SEARCH_CONSOLE" && gscSiteUrl) {
        const [current, previous] = await Promise.all([
          runQuery(`SELECT SUM(impressions) as impressions, SUM(clicks) as clicks, AVG(ctr) as ctr, AVG(position) as position FROM \`{dataset}.search_performance\` WHERE query_date >= @startDate AND query_date <= @endDate`, { startDate: thisMonthStart, endDate: thisMonthEnd }),
          runQuery(`SELECT SUM(impressions) as impressions, SUM(clicks) as clicks, AVG(ctr) as ctr, AVG(position) as position FROM \`{dataset}.search_performance\` WHERE query_date >= @startDate AND query_date <= @endDate`, { startDate: prevMonthStart, endDate: prevMonthEnd }),
        ]);
        const cur = current[0] || {};
        const prev = previous[0] || {};
        reportData.channelData["SEARCH_CONSOLE"] = {
          metrics: {
            "Organic Impressions": { current: Number(cur.impressions ?? 0), previous: Number(prev.impressions ?? 0), format: "number" },
            "Organic Clicks": { current: Number(cur.clicks ?? 0), previous: Number(prev.clicks ?? 0), format: "number" },
            CTR: { current: Number(cur.ctr ?? 0), previous: Number(prev.ctr ?? 0), format: "percentage" },
            "Avg. Position": { current: Number(cur.position ?? 0), previous: Number(prev.position ?? 0), format: "number" },
          },
        };
      }

      if (sourceType === "LINKEDIN" && linkedInOrgId) {
        const [current, previous] = await Promise.all([
          runQuery(`SELECT SUM(impressions) as impressions, SUM(likes) as reactions, MAX(total_followers) as followers FROM \`{dataset}.post_performance\` p LEFT JOIN \`{dataset}.follower_stats\` f ON 1=1 WHERE published_date >= @startDate AND published_date <= @endDate`, { startDate: thisMonthStart, endDate: thisMonthEnd }),
          runQuery(`SELECT SUM(impressions) as impressions, SUM(likes) as reactions, MAX(total_followers) as followers FROM \`{dataset}.post_performance\` p LEFT JOIN \`{dataset}.follower_stats\` f ON 1=1 WHERE published_date >= @startDate AND published_date <= @endDate`, { startDate: prevMonthStart, endDate: prevMonthEnd }),
        ]);
        const cur = current[0] || {};
        const prev = previous[0] || {};
        reportData.channelData["LINKEDIN"] = {
          metrics: {
            Impressions: { current: Number(cur.impressions ?? 0), previous: Number(prev.impressions ?? 0), format: "number" },
            Reactions: { current: Number(cur.reactions ?? 0), previous: Number(prev.reactions ?? 0), format: "number" },
            Followers: { current: Number(cur.followers ?? 0), previous: Number(prev.followers ?? 0), format: "number" },
          },
        };
      }
    }

    // Build scorecards from whatever data we gathered + manual metrics + goals
    const scorecardSlides = slides.filter((s) => s.type === "scorecard-row");
    for (const s of scorecardSlides) {
      const config = s.config as ScorecardRowConfig;
      for (const m of config.metrics) {
        if (m.source === "manual") {
          const metric = manualMetrics.find((mm) => mm.name === m.label || mm.id === m.sourceId);
          if (metric) {
            const currentEntry = metric.entries.find((e) => e.period === body.period);
            const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
            const prevEntry = metric.entries.find((e) => e.period === prevPeriod);
            reportData.scorecards[m.label] = {
              value: currentEntry?.value ?? 0,
              prevValue: prevEntry?.value,
              format: metric.displayFormat,
            };
          }
        } else if (m.source === "goal") {
          const kpi = kpis.find((k) => k.name === m.label || k.id === m.sourceId);
          if (kpi) {
            reportData.scorecards[m.label] = {
              value: kpi.cachedValue ?? 0,
              format: kpi.displayFormat,
            };
          }
        } else if (m.source === "bigquery" && m.query && propertyId) {
          try {
            const rows = await runQuery(m.query, { startDate: thisMonthStart, endDate: thisMonthEnd });
            const prevRows = await runQuery(m.query, { startDate: prevMonthStart, endDate: prevMonthEnd });
            const val = rows[0] ? Number(Object.values(rows[0])[0] ?? 0) : 0;
            const prevVal = prevRows[0] ? Number(Object.values(prevRows[0])[0] ?? 0) : undefined;
            reportData.scorecards[m.label] = { value: val, prevValue: prevVal, format: "number" };
          } catch { /* skip */ }
        }
      }
    }

    // Generate AI insights if any slide needs them
    const insightSlide = slides.find((s) => s.type === "ai-insights");
    if (insightSlide) {
      try {
        const anthropic = new Anthropic();
        const dataSnapshot = JSON.stringify({
          goals: reportData.goals,
          channels: reportData.channelData,
          manualMetrics: reportData.manualMetrics.map((m) => ({ name: m.name, latestEntries: m.entries.slice(-3) })),
        });
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: "You are a marketing analyst. Write 4-5 concise bullet points summarizing the month's performance. Highlight what's working, what declined, and 1-2 actionable recommendations. Be specific with numbers. No headers, just bullet points starting with •",
          messages: [{ role: "user", content: `Analyze this month's data for ${org?.name ?? "the client"} (${periodLabel}):\n${dataSnapshot}` }],
        });
        const text = response.content.find((b) => b.type === "text");
        reportData.aiInsights = text?.text ?? undefined;
      } catch (err) {
        console.error("[report-gen] AI insights failed:", err);
        reportData.aiInsights = "Insights could not be generated.";
      }
    }

    // Generate the PPTX
    const buffer = await generateReport(slides, reportData);

    const filename = `${org?.name ?? "Report"} — ${periodLabel}.pptx`.replace(/[^a-zA-Z0-9 —.]/g, "");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[api/reports/generate] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate report", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
