import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runPropertyQuery } from "@/lib/bigquery";
import { getOrgDataSources } from "@/lib/org-access";
import { refreshOrgKpis } from "@/lib/kpi-executor";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Date range resolution
// ---------------------------------------------------------------------------

function resolveDateRange(dateRange: string, dateFrom?: string | null, dateTo?: string | null): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 1); // yesterday (BQ data lag)

  let startDate = new Date(today);

  switch (dateRange) {
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
    case "custom":
      if (dateFrom && dateTo) {
        return { startDate: dateFrom, endDate: dateTo };
      }
      // Fall through to default 28d
      startDate.setDate(startDate.getDate() - 28);
      break;
    default: // "28d"
      startDate.setDate(startDate.getDate() - 28);
      break;
  }

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { startDate: fmt(startDate), endDate: fmt(endDate) };
}

// ---------------------------------------------------------------------------
// SQL builder (minimal version for re-running stored queries)
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
        if (aliasMatch) selectParts.push(metric);
        else {
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
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/dashboards/:id/refresh
 * Re-runs all widget queries with the current (or overridden) date range.
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

  // Optional date range override from request body
  const body = (await request.json().catch(() => ({}))) as {
    dateRange?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
  };

  try {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      include: { widgets: true },
    });

    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    // Resolve date range
    const dateRange = body.dateRange || dashboard.dateRange;
    const dateFrom = body.dateFrom !== undefined ? body.dateFrom : dashboard.dateFrom;
    const dateTo = body.dateTo !== undefined ? body.dateTo : dashboard.dateTo;
    const { startDate, endDate } = resolveDateRange(dateRange, dateFrom, dateTo);

    // Resolve data sources from the org
    const orgDataSources = await getOrgDataSources(dashboard.orgId);
    const connectedStatuses = ["ACTIVE", "BACKFILLING", "ERROR"];
    const ga4Ds = orgDataSources.find((ds) => ds.type === "GA4_BIGQUERY" && connectedStatuses.includes(ds.status));
    const propertyId = ga4Ds?.propertyId ?? "";
    const adsCustomerId = orgDataSources.find((ds) => ds.type === "GOOGLE_ADS" && connectedStatuses.includes(ds.status))?.adsCustomerId ?? null;
    const linkedInOrgId = orgDataSources.find((ds) => ds.type === "LINKEDIN" && connectedStatuses.includes(ds.status))?.propertyId ?? null;
    const mailchimpListId = orgDataSources.find((ds) => ds.type === "MAILCHIMP" && connectedStatuses.includes(ds.status))?.propertyId ?? null;
    const gscSiteUrl = orgDataSources.find((ds) => ds.type === "SEARCH_CONSOLE" && connectedStatuses.includes(ds.status))?.propertyId ?? null;
    const msAdsAccountId = orgDataSources.find((ds) => ds.type === "MICROSOFT_ADS" && connectedStatuses.includes(ds.status))?.propertyId ?? null;

    // Refresh each widget in parallel
    const results = await Promise.all(
      dashboard.widgets.map(async (widget) => {
        const queryConfig = widget.queryConfig as { tool?: string; input?: Record<string, unknown> } | null;
        if (!queryConfig?.tool || !queryConfig?.input) {
          return { widgetId: widget.id, error: "No query config", rows: null };
        }

        try {
          let rows: unknown;

          if (queryConfig.tool === "query_analytics") {
            // Override dates in the structured input
            const input = { ...queryConfig.input, startDate, endDate } as QueryAnalyticsInput;
            const { sql, params } = buildAnalyticsSQL(input);
            console.log(`[dashboard-refresh] Widget ${widget.id}: dates=${startDate}→${endDate}, SQL=${sql.slice(0, 200)}`);
            console.log(`[dashboard-refresh] Params:`, JSON.stringify(params));
            const result = await runPropertyQuery(propertyId, sql, params, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId);
            rows = result.rows;
          } else {
            // For raw SQL tools (ads, linkedin, mailchimp, gsc, msads), substitute date params
            let sql = queryConfig.input.sql as string;
            const sqlParams: Record<string, unknown> = {};

            // Preferred path: @startDate/@endDate parameters (all new widgets use this)
            if (sql.includes("@startDate")) {
              sqlParams.startDate = startDate;
            }
            if (sql.includes("@endDate")) {
              sqlParams.endDate = endDate;
            }

            // Fallback for legacy widgets with hardcoded dates:
            // Match any 'YYYY-MM-DD' >= AND <= pattern
            if (!sqlParams.startDate) {
              sql = sql.replace(
                />=\s*'(\d{4}-\d{2}-\d{2})'/g,
                `>= '${startDate}'`
              );
              sql = sql.replace(
                /<=\s*'(\d{4}-\d{2}-\d{2})'/g,
                `<= '${endDate}'`
              );
              // Also handle DATE_SUB patterns
              sql = sql.replace(
                /DATE_SUB\s*\(\s*CURRENT_DATE\s*\(\s*\)\s*,\s*INTERVAL\s+\d+\s+DAY\s*\)/gi,
                `'${startDate}'`
              );
              sql = sql.replace(
                /CURRENT_DATE\s*\(\s*\)/gi,
                `'${endDate}'`
              );
            }

            const result = await runPropertyQuery(
              propertyId,
              sql,
              Object.keys(sqlParams).length > 0 ? sqlParams : undefined,
              adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId
            );
            rows = result.rows;
          }

          // Update cached data on the widget
          await prisma.widget.update({
            where: { id: widget.id },
            data: { cachedData: rows as object, cachedAt: new Date() },
          });

          return { widgetId: widget.id, rows };
        } catch (err) {
          console.error(`[dashboard-refresh] Widget ${widget.id} failed:`, err);
          const errMsg = err instanceof Error ? err.message : "Query failed";

          // If the error is a missing dataset, mark the DataSource as ERROR
          // so the UI can show a meaningful banner instead of silent "no data".
          if (errMsg.includes("Not found") && ga4Ds) {
            prisma.dataSource.update({
              where: { id: ga4Ds.id },
              data: {
                status: "ERROR",
                lastSyncError: `BigQuery dataset not found. Check that GA4 BigQuery export is active and linked to the correct project.`,
              },
            }).catch((e) => console.error("[dashboard-refresh] Failed to update DataSource status:", e));
          }

          return { widgetId: widget.id, error: errMsg, rows: null };
        }
      })
    );

    // Also refresh KPIs so dashboard KPI overlays stay in sync
    refreshOrgKpis(dashboard.orgId).catch((e) =>
      console.error("[dashboard-refresh] KPI refresh failed:", e)
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[api/dashboards/:id/refresh] Error:", err);
    return NextResponse.json({ error: "Failed to refresh" }, { status: 500 });
  }
}
