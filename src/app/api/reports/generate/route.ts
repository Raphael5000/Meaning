import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runPropertyQuery } from "@/lib/bigquery";
import { getOrgDataSources } from "@/lib/org-access";
import { fillTemplate, renderPdf } from "@/lib/report-engine";
import type { SlideDefinition } from "@/lib/report-types";

export const dynamic = "force-dynamic";

/** POST /api/reports/generate — render a report template to PDF */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json()) as { templateId: string; period: string };
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
    const [year, month] = body.period.split("-").map(Number);
    const periodLabel = new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const thisMonthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const thisMonthEnd = new Date(year, month, 0).toISOString().split("T")[0];
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const prevMonthEnd = new Date(prevYear, prevMonth, 0).toISOString().split("T")[0];

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

    // Pre-fetch common data that slides might need
    const [kpis, manualMetrics] = await Promise.all([
      prisma.kpi.findMany({ where: { orgId }, orderBy: { sortOrder: "asc" } }),
      prisma.manualMetric.findMany({ where: { orgId }, include: { entries: { orderBy: { period: "desc" }, take: 12 } } }),
    ]);

    // Resolve each slide's data bindings
    const filledPages: string[] = [];

    for (const slide of slides) {
      if (!slide.htmlTemplate) {
        filledPages.push(`<div class="slide bg-dark" style="display:flex;align-items:center;justify-content:center;"><p class="text-muted">Empty slide</p></div>`);
        continue;
      }

      const resolved: Record<string, string> = {
        orgName: org?.name ?? "",
        period: periodLabel,
        currency: org?.displayCurrency ?? "USD",
      };

      for (const binding of slide.dataBindings || []) {
        try {
          switch (binding.source) {
            case "static":
              resolved[binding.placeholder] = binding.value;
              break;

            case "org":
              if (binding.value === "name") resolved[binding.placeholder] = org?.name ?? "";
              else if (binding.value === "currency") resolved[binding.placeholder] = org?.displayCurrency ?? "USD";
              else if (binding.value === "period") resolved[binding.placeholder] = periodLabel;
              break;

            case "manual": {
              const metric = manualMetrics.find((m) => m.name === binding.value || m.id === binding.value);
              if (metric) {
                const currentEntry = metric.entries.find((e) => e.period === body.period);
                resolved[binding.placeholder] = currentEntry
                  ? currentEntry.value.toLocaleString()
                  : "—";
              }
              break;
            }

            case "goal": {
              const kpi = kpis.find((k) => k.name === binding.value || k.id === binding.value);
              if (kpi) {
                resolved[binding.placeholder] = kpi.cachedValue?.toLocaleString() ?? "—";
              }
              break;
            }

            case "bigquery": {
              const rows = await runQuery(binding.value, {
                startDate: thisMonthStart,
                endDate: thisMonthEnd,
                prevStartDate: prevMonthStart,
                prevEndDate: prevMonthEnd,
              });
              if (rows.length > 0) {
                const row = rows[0];
                const entries = Object.entries(row);
                if (entries.length === 1) {
                  // Single value — use placeholder directly
                  const val = entries[0][1];
                  resolved[binding.placeholder] = typeof val === "number"
                    ? val.toLocaleString()
                    : String(val ?? "—");
                } else {
                  // Multiple columns — flatten with prefix
                  // e.g. placeholder "ads" + column "impressions" → "ads_impressions"
                  for (const [col, val] of entries) {
                    const key = `${binding.placeholder}_${col}`;
                    let formatted: string;
                    if (val === null || val === undefined) {
                      formatted = "—";
                    } else if (typeof val === "number") {
                      formatted = Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2);
                    } else {
                      formatted = String(val);
                    }
                    resolved[key] = formatted;
                  }
                  // Also set the base placeholder to the first value for simple references
                  const firstVal = entries[0][1];
                  resolved[binding.placeholder] = typeof firstVal === "number"
                    ? firstVal.toLocaleString()
                    : String(firstVal ?? "—");
                }
              }
              break;
            }
          }
        } catch {
          resolved[binding.placeholder] = "—";
        }
      }

      // Auto-resolve {{goals_html}} if present in template
      if (slide.htmlTemplate.includes("{{goals_html}}")) {
        const goalsHtml = kpis.map((k) => {
          const pct = k.cachedValue !== null && k.targetValue > 0
            ? Math.min(100, (k.cachedValue / k.targetValue) * 100)
            : 0;
          const color = pct >= 90 ? "#00A352" : pct >= 60 ? "#F59E0B" : "#EF4444";
          const status = pct >= 90 ? "On track" : pct >= 60 ? "At risk" : "Off track";
          return `<div class="card" style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;font-weight:500;">${k.name}</span>
              <span style="font-size:10px;color:${color};">${status}</span>
            </div>
            <div style="font-size:24px;font-weight:600;" class="tabular">${k.cachedValue?.toLocaleString() ?? "—"} <span style="font-size:12px;color:#888;">/ ${k.targetValue.toLocaleString()}</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct.toFixed(0)}%;background:${color};"></div></div>
            <div style="text-align:right;font-size:10px;color:${color};" class="tabular">${pct.toFixed(0)}%</div>
          </div>`;
        }).join("\n");
        resolved["goals_html"] = goalsHtml;
      }

      // Auto-resolve {{insights}} if present
      if (slide.htmlTemplate.includes("{{insights}}") && !resolved["insights"]) {
        try {
          const anthropic = new Anthropic();
          const snapshot = JSON.stringify({
            goals: kpis.map((k) => ({ name: k.name, value: k.cachedValue, target: k.targetValue })),
            manualMetrics: manualMetrics.map((m) => ({ name: m.name, latest: m.entries[0] })),
          });
          const resp = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 400,
            system: "You are a marketing analyst. Write 4-5 concise HTML bullet points (<ul><li>...</li></ul>) summarizing the month's performance. Be specific with numbers. Use <span style=\"color:#00A352\"> for positive and <span style=\"color:#EF4444\"> for negative highlights.",
            messages: [{ role: "user", content: `Data for ${org?.name} (${periodLabel}):\n${snapshot}` }],
          });
          const text = resp.content.find((b) => b.type === "text");
          resolved["insights"] = text?.text ?? "No insights available.";
        } catch {
          resolved["insights"] = "Insights could not be generated.";
        }
      }

      console.log(`[report-gen] Slide "${slide.title}" resolved ${Object.keys(resolved).length} placeholders:`, Object.keys(resolved).join(", "));
      const filledHtml = fillTemplate(slide.htmlTemplate, slide.dataBindings || [], resolved);
      // Log any remaining unfilled placeholders
      const unfilled = filledHtml.match(/\{\{[^}]+\}\}/g);
      if (unfilled) console.warn(`[report-gen] Slide "${slide.title}" has ${unfilled.length} unfilled placeholders:`, unfilled.slice(0, 10).join(", "));
      filledPages.push(filledHtml);
    }

    const pdf = await renderPdf(filledPages);

    const filename = `${org?.name ?? "Report"} - ${periodLabel}.pdf`.replace(/[^a-zA-Z0-9 \-.]/g, "");

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
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
