import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrgDataSources } from "@/lib/org-access";
import { getTemplateWidgets } from "@/lib/dashboard-templates";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minute timeout for generating all widgets

/**
 * POST /api/dashboards/:id/generate
 *
 * Auto-generates all template widgets for a monthly/yearly dashboard.
 * Calls the widget creation endpoint sequentially to avoid layout race
 * conditions, then builds a clean grid layout with dividers.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: dashboardId } = await params;

  try {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      select: { orgId: true, dashboardType: true, widgets: { select: { id: true } } },
    });
    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }
    if (dashboard.dashboardType !== "monthly" && dashboard.dashboardType !== "yearly") {
      return NextResponse.json({ error: "Only monthly/yearly dashboards support auto-generation" }, { status: 400 });
    }
    if (dashboard.widgets.length > 0) {
      return NextResponse.json({ error: "Dashboard already has widgets" }, { status: 400 });
    }

    // Determine connected sources
    const orgDataSources = await getOrgDataSources(dashboard.orgId);
    const connectedStatuses = ["ACTIVE", "BACKFILLING", "ERROR"];
    const connectedTypes = [...new Set(
      orgDataSources
        .filter((ds) => connectedStatuses.includes(ds.status))
        .map((ds) => ds.type),
    )];

    const specs = getTemplateWidgets(
      dashboard.dashboardType as "monthly" | "yearly",
      connectedTypes,
    );
    if (specs.length === 0) {
      return NextResponse.json({ error: "No connected data sources" }, { status: 400 });
    }

    // Build the internal base URL for calling the widget endpoint
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3001";
    const baseUrl = `${proto}://${host}`;

    // Forward auth cookies
    const cookie = request.headers.get("cookie") || "";

    console.log(`[dashboard-generate] Starting generation of ${specs.length} widgets for dashboard ${dashboardId}`);

    // Group specs by source type for dividers
    interface WidgetResult {
      widget: {
        id: string;
        widgetType: string;
        title: string;
        displayConfig: unknown;
        cachedData: unknown;
        cachedAt: string | null;
        prompt: string;
      };
      sourceGroup: string;
    }

    function getSourceGroup(prompt: string): string {
      const lower = prompt.toLowerCase();
      if (lower.includes("google ads")) return "Google Ads";
      if (lower.includes("microsoft ads")) return "Microsoft Ads";
      if (lower.includes("search console") || lower.includes("gsc")) return "Search Console";
      if (lower.includes("linkedin")) return "LinkedIn";
      if (lower.includes("mailchimp")) return "Mailchimp";
      if (lower.includes("attio") || lower.includes("crm deal") || lower.includes("pipeline")) return "CRM";
      if (lower.includes("ahrefs") || lower.includes("domain rating") || lower.includes("organic keyword")) return "Ahrefs";
      if (lower.includes("cost per") && lower.includes("lead")) return "Cross-Channel";
      if (lower.includes("session") || lower.includes("user") || lower.includes("website")) return "Website";
      return "Other";
    }

    // Fire all widget creations in parallel (don't care about layout — we'll build it ourselves)
    const results = await Promise.allSettled(
      specs.map(async (spec): Promise<WidgetResult> => {
        const res = await fetch(`${baseUrl}/api/dashboards/${dashboardId}/widgets`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie },
          body: JSON.stringify({ prompt: spec.prompt, chartType: spec.chartType }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Widget generation failed (${res.status})`);
        }
        const data = await res.json();
        return { widget: data.widget, sourceGroup: getSourceGroup(spec.prompt) };
      }),
    );

    const succeeded = results
      .filter((r): r is PromiseFulfilledResult<WidgetResult> => r.status === "fulfilled")
      .map((r) => r.value);
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`[dashboard-generate] ${succeeded.length} succeeded, ${failed} failed`);

    if (succeeded.length === 0) {
      return NextResponse.json({ error: "All widget generations failed" }, { status: 500 });
    }

    // ── Build a clean layout with dividers ──
    // Group widgets by source, add divider widgets between groups
    const groupOrder = ["Website", "Google Ads", "Microsoft Ads", "Search Console", "LinkedIn", "Mailchimp", "CRM", "Ahrefs", "Cross-Channel", "Other"];
    const grouped = new Map<string, WidgetResult[]>();
    for (const r of succeeded) {
      const group = r.sourceGroup;
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push(r);
    }

    const layout: { i: string; x: number; y: number; w: number; h: number }[] = [];
    const allWidgetIds: string[] = succeeded.map((r) => r.widget.id);
    const dividerWidgets: { id: string; title: string }[] = [];
    let cursorY = 0;

    for (const groupName of groupOrder) {
      const items = grouped.get(groupName);
      if (!items || items.length === 0) continue;

      // Add a divider for this group (skip if it's the first/only group)
      if (layout.length > 0) {
        // Create a divider widget in DB
        const divider = await prisma.widget.create({
          data: {
            dashboardId,
            prompt: groupName,
            widgetType: "divider",
            queryConfig: {},
            displayConfig: { label: groupName },
            title: groupName,
          },
        });
        dividerWidgets.push({ id: divider.id, title: groupName });
        layout.push({ i: divider.id, x: 0, y: cursorY, w: 12, h: 1 });
        cursorY += 1;
      }

      // Separate scorecards from charts/tables
      const scorecards = items.filter((r) => r.widget.widgetType === "scorecard");
      const charts = items.filter((r) => r.widget.widgetType === "chart");
      const tables = items.filter((r) => r.widget.widgetType === "table");

      // Layout scorecards: 3 per row (4w each)
      let scX = 0;
      for (const sc of scorecards) {
        if (scX + 4 > 12) {
          scX = 0;
          cursorY += 2;
        }
        layout.push({ i: sc.widget.id, x: scX, y: cursorY, w: 4, h: 2 });
        scX += 4;
      }
      if (scorecards.length > 0) cursorY += 2;

      // Layout charts: 2 per row (6w each)
      let chX = 0;
      for (const ch of charts) {
        if (chX + 6 > 12) {
          chX = 0;
          cursorY += 4;
        }
        layout.push({ i: ch.widget.id, x: chX, y: cursorY, w: 6, h: 4 });
        chX += 6;
      }
      if (charts.length > 0) cursorY += 4;

      // Layout tables: full width
      for (const tb of tables) {
        layout.push({ i: tb.widget.id, x: 0, y: cursorY, w: 12, h: 4 });
        cursorY += 4;
      }
    }

    // Save the final layout (overwrites the individual widget layouts)
    await prisma.dashboard.update({
      where: { id: dashboardId },
      data: { layout },
    });

    // Fetch all widgets for the response
    const allWidgets = await prisma.widget.findMany({
      where: { dashboardId },
    });

    console.log(`[dashboard-generate] Layout built: ${layout.length} items (${dividerWidgets.length} dividers)`);

    return NextResponse.json({
      widgets: allWidgets,
      layout,
      generated: succeeded.length,
      failed,
    });
  } catch (err) {
    console.error("[api/dashboards/:id/generate] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate dashboard", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
