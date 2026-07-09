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
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1); // BQ data lag
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (dateRange) {
    case "monthly": {
      // dateFrom stores "YYYY-MM"
      const ym = dateFrom || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      const [y, m] = ym.split("-").map(Number);
      const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
      // Last day of month
      const lastDay = new Date(y, m, 0); // day 0 of next month = last day of this month
      // Cap at yesterday if this is the current month
      const endDate = lastDay > yesterday ? fmt(yesterday) : fmt(lastDay);
      return { startDate, endDate };
    }
    case "yearly": {
      // dateFrom stores "YYYY"
      const year = dateFrom ? Number(dateFrom) : today.getFullYear();
      const startDate = `${year}-01-01`;
      const lastDay = new Date(year, 11, 31);
      const endDate = lastDay > yesterday ? fmt(yesterday) : fmt(lastDay);
      return { startDate, endDate };
    }
    case "7d": {
      const s = new Date(today);
      s.setDate(s.getDate() - 7);
      return { startDate: fmt(s), endDate: fmt(yesterday) };
    }
    case "90d": {
      const s = new Date(today);
      s.setDate(s.getDate() - 90);
      return { startDate: fmt(s), endDate: fmt(yesterday) };
    }
    case "custom":
      if (dateFrom && dateTo) {
        return { startDate: dateFrom, endDate: dateTo };
      }
      // Fall through to default 28d
      // eslint-disable-next-line no-fallthrough
    default: {
      const s = new Date(today);
      s.setDate(s.getDate() - 28);
      return { startDate: fmt(s), endDate: fmt(yesterday) };
    }
  }
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
  // Allow either session auth (UI) or Bearer CRON_SECRET (server-to-server)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCronAuth) {
    const session = await auth();
    const userId = (session as { userId?: string })?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
  }

  const { id: dashboardId } = await params;

  // Optional date range override from request body
  const body = (await request.json().catch(() => ({}))) as {
    dateRange?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
    widgetIds?: string[];
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
    const ahrefsOrgId = orgDataSources.find((ds) => ds.type === "AHREFS" && connectedStatuses.includes(ds.status)) ? dashboard.orgId : null;
    const attioOrgId = orgDataSources.find((ds) => ds.type === "ATTIO" && connectedStatuses.includes(ds.status)) ? dashboard.orgId : null;

    // Optionally filter to specific widgets
    const widgetsToRefresh = body.widgetIds?.length
      ? dashboard.widgets.filter((w) => body.widgetIds!.includes(w.id))
      : dashboard.widgets;

    // -----------------------------------------------------------------------
    // Helper: execute a single query config and return rows
    // -----------------------------------------------------------------------
    async function executeQuery(
      qc: { tool: string; input: Record<string, unknown> },
      widgetTitle: string,
    ): Promise<{ rows: unknown; tool: string } | null> {
      if (qc.tool === "query_analytics") {
        const input = { ...qc.input, startDate, endDate } as QueryAnalyticsInput;
        const { sql, params } = buildAnalyticsSQL(input);
        console.log(`[dashboard-refresh] → query_analytics: dates=${startDate}→${endDate}, SQL=${sql.slice(0, 200)}`);
        const result = await runPropertyQuery(propertyId, sql, params, adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId, ahrefsOrgId, attioOrgId);
        return { rows: result.rows, tool: qc.tool };
      }

      if (qc.tool === "query_manual_metrics") {
        const input = qc.input as { metric_ids: string[]; year?: number };
        const entries = await prisma.manualMetricEntry.findMany({
          where: {
            metricId: { in: input.metric_ids },
            ...(input.year ? { period: { startsWith: String(input.year) } } : {}),
          },
          include: { metric: { select: { name: true } } },
          orderBy: { period: "asc" },
        });
        const periodMap = new Map<string, Record<string, unknown>>();
        const metricNames = new Set<string>();
        for (const e of entries) {
          metricNames.add(e.metric.name);
          if (!periodMap.has(e.period)) {
            const [y, m] = e.period.split("-");
            const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
            periodMap.set(e.period, { month: label });
          }
          periodMap.get(e.period)![e.metric.name] = e.value;
        }
        for (const [, row] of periodMap) {
          for (const name of metricNames) {
            if (!(name in row)) row[name] = 0;
          }
        }
        const rows = Array.from(periodMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, row]) => row);
        console.log(`[dashboard-refresh] → manual metrics: ${rows.length} rows`);
        return { rows, tool: qc.tool };
      }

      if (!qc.input.sql) return null;

      // Raw SQL tools (ads, linkedin, mailchimp, gsc, msads, ahrefs)
      let sql = qc.input.sql as string;
      const sqlParams: Record<string, unknown> = {};

      if (sql.includes("@startDate")) sqlParams.startDate = startDate;
      if (sql.includes("@endDate")) sqlParams.endDate = endDate;

      if (!sqlParams.startDate) {
        // Replace hardcoded date literals (e.g. '2026-07-01') with the
        // resolved date range. Find GENERATE_DATE_ARRAY('YYYY-MM-DD', 'YYYY-MM-DD')
        // and replace both dates with startDate/endDate.
        sql = sql.replace(
          /GENERATE_DATE_ARRAY\s*\(\s*'(\d{4}-\d{2}-\d{2})'\s*,\s*'(\d{4}-\d{2}-\d{2})'\s*\)/gi,
          `GENERATE_DATE_ARRAY('${startDate}', '${endDate}')`
        );

        // Replace DATE_TRUNC(CURRENT_DATE(), MONTH) → start of the target month
        // This must happen BEFORE the generic CURRENT_DATE() replacement
        sql = sql.replace(
          /DATE_TRUNC\s*\(\s*CURRENT_DATE\s*\(\s*\)\s*,\s*MONTH\s*\)/gi,
          `DATE('${startDate.slice(0, 7)}-01')`
        );
        // Replace DATE_TRUNC(CURRENT_DATE(), YEAR) → start of the target year
        sql = sql.replace(
          /DATE_TRUNC\s*\(\s*CURRENT_DATE\s*\(\s*\)\s*,\s*YEAR\s*\)/gi,
          `DATE('${startDate.slice(0, 4)}-01-01')`
        );

        sql = sql.replace(
          /DATE_SUB\s*\(\s*CURRENT_DATE\s*\(\s*\)\s*,\s*INTERVAL\s+\d+\s+DAY\s*\)/gi,
          `DATE('${startDate}')`
        );
        sql = sql.replace(/CURRENT_DATE\s*\(\s*\)/gi, `DATE('${endDate}')`);

        const yesterday = endDate;
        const todayStr = new Date().toISOString().split("T")[0];
        const currentYM = todayStr.slice(0, 7);
        sql = sql.replace(
          new RegExp(`'(${currentYM}-(0[2-9]|1\\d|2[0-7]))'`, "g"),
          `'${yesterday}'`
        );
        const prevMonth = new Date();
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        const prevYM = prevMonth.toISOString().split("T")[0].slice(0, 7);
        const yesterdayDay = yesterday.slice(8);
        sql = sql.replace(
          new RegExp(`'(${prevYM}-(0[2-9]|1\\d|2[0-7]))'`, "g"),
          `'${prevYM}-${yesterdayDay}'`
        );

        // For monthly/yearly dashboards: MTD/YTD queries often have no upper
        // date bound — they rely on CURRENT_DATE() being "today" so future
        // data can't exist. When viewing a past month/year, data after the
        // period end leaks in. Fix: cap the outermost WHERE with endDate.
        if (dateRange === "monthly" || dateRange === "yearly") {
          const dateCol =
            /campaign_performance|keyword_performance|click_attribution/.test(sql) ? "stats_date" :
            /search_performance/.test(sql) ? "query_date" :
            /traffic_sources|sessions/.test(sql) ? "session_date" :
            /post_performance|follower_stats|page_stats/.test(sql) ? "stats_date" :
            /campaign_reports|audience/.test(sql) ? "stats_date" :
            /msads_/.test(sql) ? "stats_date" :
            /pageviews|conversions|stg_events/.test(sql) ? "event_date" :
            null;
          if (dateCol && !sql.includes(`'${endDate}'`)) {
            // Find the outermost (last) WHERE clause and prepend the date cap.
            // For CTEs, inner WHEREs come before the outer one, so lastIndexOf
            // targets the right clause.
            const whereIdx = sql.lastIndexOf("WHERE");
            if (whereIdx >= 0) {
              const insertPoint = whereIdx + 5;
              sql = sql.slice(0, insertPoint) + ` ${dateCol} <= DATE('${endDate}') AND` + sql.slice(insertPoint);
            }
          }
        }
      }

      console.log(`[dashboard-refresh] → final SQL (${widgetTitle}): ${sql.replace(/\n/g, ' ').slice(0, 800)}`);
      const result = await runPropertyQuery(
        propertyId,
        sql,
        Object.keys(sqlParams).length > 0 ? sqlParams : undefined,
        adsCustomerId, linkedInOrgId, mailchimpListId, gscSiteUrl, msAdsAccountId, ahrefsOrgId, attioOrgId
      );
      return { rows: result.rows, tool: qc.tool };
    }

    // -----------------------------------------------------------------------
    // Helper: merge rows from multiple queries by shared dimension (month)
    // -----------------------------------------------------------------------
    function mergeMultiQueryRows(allRows: Array<{ rows: unknown; tool: string }>): unknown[] {
      const merged = new Map<string, Record<string, unknown>>();

      for (const { rows } of allRows) {
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const rowArr = rows as Record<string, unknown>[];
        // Find dimension key (first string column like "month")
        const dimKey = Object.keys(rowArr[0]).find((k) => {
          const v = rowArr[0][k];
          return typeof v === "string" && /^(month|date|period|day|week)$/i.test(k);
        }) || Object.keys(rowArr[0]).find((k) => typeof rowArr[0][k] === "string");
        if (!dimKey) continue;

        for (const row of rowArr) {
          const key = String(row[dimKey] ?? "");
          if (!merged.has(key)) merged.set(key, { [dimKey]: row[dimKey] });
          const target = merged.get(key)!;
          for (const [k, v] of Object.entries(row)) {
            if (k === dimKey) continue;
            // Skip sort columns (month_sort etc.)
            if (k.endsWith("_sort")) continue;
            target[k] = v;
          }
        }
      }

      return Array.from(merged.values());
    }

    // Refresh each widget in parallel
    const results = await Promise.all(
      widgetsToRefresh.map(async (widget) => {
        const queryConfig = widget.queryConfig as {
          tool?: string;
          input?: Record<string, unknown>;
          allQueries?: { tool: string; input: Record<string, unknown> }[];
        } | null;
        console.log(`[dashboard-refresh] Widget ${widget.id} (${widget.title}): tool=${queryConfig?.tool ?? "none"}${queryConfig?.allQueries ? `, allQueries=${queryConfig.allQueries.length}` : ""}`);
        if (!queryConfig?.tool || !queryConfig?.input) {
          console.log(`[dashboard-refresh] → skipped (no query config)`);
          return { widgetId: widget.id, error: "No query config", rows: null };
        }

        try {
          let rows: unknown;

          // Multi-query widgets: run all queries and merge results.
          // Scorecards always use the single primary query — allQueries contains
          // exploratory queries from the AI's generation process that produce
          // incompatible row shapes and break the merge.
          const useMultiQuery = queryConfig.allQueries && queryConfig.allQueries.length > 1
            && widget.widgetType !== "scorecard";
          if (useMultiQuery) {
            const queryResults = await Promise.all(
              queryConfig.allQueries.map((qc) =>
                executeQuery(qc, widget.title).catch((err) => {
                  console.error(`[dashboard-refresh] Sub-query failed (${qc.tool}):`, err instanceof Error ? err.message : err);
                  return null;
                })
              )
            );
            const validResults = queryResults.filter((r): r is { rows: unknown; tool: string } => r !== null);
            if (validResults.length > 0) {
              rows = mergeMultiQueryRows(validResults);
              console.log(`[dashboard-refresh] → merged ${validResults.length} queries → ${Array.isArray(rows) ? (rows as unknown[]).length : 0} rows`);
            } else {
              return { widgetId: widget.id, error: "All sub-queries failed", rows: null };
            }
          } else {
            // Single query path
            const result = await executeQuery(
              { tool: queryConfig.tool, input: queryConfig.input },
              widget.title,
            );
            if (!result) return { widgetId: widget.id, rows: null };
            rows = result.rows;
          }

          // Update cached data on the widget
          console.log(`[dashboard-refresh] → success, rows=${Array.isArray(rows) ? (rows as unknown[]).length : typeof rows}`);

          // For scorecard widgets, also update displayConfig.value with the
          // fresh computed value so the scorecard renders the latest data.
          const updateData: { cachedData: object; cachedAt: Date; displayConfig?: object } = {
            cachedData: rows as object,
            cachedAt: new Date(),
          };

          // For chart widgets with manual metrics where the AI split data into
          // year-based series (e.g. "2025" and "2026"), update the series data
          // arrays from the fresh rows so the chart reflects latest values.
          if (widget.widgetType === "chart" && queryConfig.tool === "query_manual_metrics"
            && Array.isArray(rows) && (rows as Record<string, unknown>[]).length > 0) {
            const rowArr = rows as Record<string, unknown>[];
            const dc = (widget.displayConfig ?? {}) as Record<string, unknown>;
            const series = dc.series as Array<Record<string, unknown>> | undefined;
            if (Array.isArray(series) && series.length > 0) {
              // Find the metric column
              const dimKeys = new Set(["month", "period", "date", "day", "week", "year"]);
              const metricKey = Object.keys(rowArr[0]).find(
                (k) => !dimKeys.has(k.toLowerCase()) && typeof rowArr[0][k] === "number"
              );
              if (metricKey) {
                // Build a lookup: "Jan 2025" → value
                const lookup = new Map(rowArr.map((r) => [String(r.month ?? ""), Number(r[metricKey])]));
                const shortMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const currentYear = new Date().getFullYear();
                const updatedSeries = series.map((s) => {
                  const yearStr = String(s.name ?? "");
                  if (!/^20\d{2}$/.test(yearStr)) return s;
                  // Rebuild data array for this year's 12 months
                  const newData = shortMonths.map((m) => {
                    const key = `${m} ${yearStr}`;
                    return lookup.has(key) ? lookup.get(key)! : null;
                  });
                  // Current year = green, previous years = grey
                  const yr = Number(yearStr);
                  const color = yr >= currentYear ? "#10a37f" : "#9ca3af";
                  return { ...s, data: newData, itemStyle: { ...(s.itemStyle as Record<string, unknown> ?? {}), color } };
                });
                console.log(`[dashboard-refresh] → chart series updated from fresh manual metrics`);
                updateData.displayConfig = { ...dc, series: updatedSeries };
              }
            }
          }

          // For manual-metrics scorecards, recompute value + change from fresh rows.
          // Skip BQ-backed scorecards — the AI may have done custom math (e.g. spend/leads)
          // that we can't replicate from raw query results.
          if (widget.widgetType === "scorecard" && queryConfig.tool === "query_manual_metrics"
            && Array.isArray(rows) && (rows as Record<string, unknown>[]).length > 0) {
            const rowArr = rows as Record<string, unknown>[];
            const dc = (widget.displayConfig ?? {}) as Record<string, unknown>;
            const dimKeys = new Set(["month", "period", "date", "day", "week", "year"]);
            const firstRow = rowArr[0];
            const metricKey = Object.keys(firstRow).find(
              (k) => !dimKeys.has(k.toLowerCase()) && typeof firstRow[k] === "number"
            );
            if (metricKey) {
              let newValue: number;
              let prevValue: number | null = null;
              const title = (widget.title ?? "").toLowerCase();
              const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
              const shortMonths = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
              const titleMonthIdx = months.findIndex((m) => title.includes(m));
              const titleShortMonthIdx = titleMonthIdx >= 0 ? titleMonthIdx : shortMonths.findIndex((m) => new RegExp(`\\b${m}\\b`).test(title));
              const specificMonth = titleMonthIdx >= 0 ? titleMonthIdx : titleShortMonthIdx;
              const wantsYtd = /\bytd\b/.test(title);
              const input = queryConfig.input as { year?: number };
              const titleYearMatch = title.match(/\b(20\d{2})\b/);
              const year = input.year ?? (titleYearMatch ? Number(titleYearMatch[1]) : new Date().getFullYear());

              if (rowArr.length === 1) {
                newValue = Number(firstRow[metricKey]);
              } else if (specificMonth >= 0) {
                // Title mentions a specific month → find that month's value
                const monthLabel = shortMonths[specificMonth].charAt(0).toUpperCase() + shortMonths[specificMonth].slice(1);
                const matchRow = rowArr.find((r) => {
                  const m = String(r.month ?? "");
                  return m.startsWith(monthLabel) && m.includes(String(year));
                });
                newValue = matchRow ? Number(matchRow[metricKey]) : Number(rowArr[rowArr.length - 1][metricKey]);
                // Previous period = previous month (month-over-month comparison)
                const prevMonthIdx = specificMonth > 0 ? specificMonth - 1 : 11;
                const prevMonthYear = specificMonth > 0 ? year : year - 1;
                const prevMonthLabel = shortMonths[prevMonthIdx].charAt(0).toUpperCase() + shortMonths[prevMonthIdx].slice(1);
                const prevRow = rowArr.find((r) => {
                  const m = String(r.month ?? "");
                  return m.startsWith(prevMonthLabel) && m.includes(String(prevMonthYear));
                });
                if (prevRow) prevValue = Number(prevRow[metricKey]);
              } else if (wantsYtd) {
                // Sum all months for the target year
                const yearPrefix = String(year);
                newValue = rowArr
                  .filter((r) => String(r.month ?? "").includes(yearPrefix))
                  .reduce((sum, r) => sum + (Number(r[metricKey]) || 0), 0);
                // Previous = same months of previous year
                const prevYearPrefix = String(year - 1);
                // Only compare same number of months (e.g. Jan-Jun 2025 vs Jan-Jun 2026)
                const currentYearMonths = rowArr.filter((r) => String(r.month ?? "").includes(yearPrefix));
                const monthCount = currentYearMonths.length;
                const prevYearRows = rowArr
                  .filter((r) => String(r.month ?? "").includes(prevYearPrefix))
                  .slice(0, monthCount);
                if (prevYearRows.length > 0) {
                  prevValue = prevYearRows.reduce((sum, r) => sum + (Number(r[metricKey]) || 0), 0);
                }
              } else {
                newValue = Number(rowArr[rowArr.length - 1][metricKey]);
              }

              // Format value
              const origValue = String(dc.value ?? "");
              const currPrefix = origValue.match(/^([A-Z]{1,3}\$?|[R€£¥₹₦₱₩₺₪฿])\s?/)?.[1] ?? "";
              const formatted = currPrefix
                ? `${currPrefix}${newValue.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(newValue) ? 0 : 2, maximumFractionDigits: 2 })}`
                : String(newValue);

              // Compute change vs previous period
              let change: string | undefined = dc.change as string | undefined;
              if (prevValue !== null && prevValue !== 0) {
                const pctChange = ((newValue - prevValue) / prevValue) * 100;
                const sign = pctChange >= 0 ? "+" : "";
                change = `${sign}${pctChange.toFixed(1)}%`;
              }

              console.log(`[dashboard-refresh] → scorecard value: ${dc.value} → ${formatted}, change: ${dc.change} → ${change}`);
              updateData.displayConfig = { ...dc, value: formatted, change };
            }
          }

          // For BQ-backed scorecards, update displayConfig.value + change from
          // the fresh query result. The AI typically names columns "current_X" and
          // "previous_X" (or "prev_X") so we can extract both values.
          if (widget.widgetType === "scorecard" && queryConfig.tool !== "query_manual_metrics"
            && !updateData.displayConfig
            && Array.isArray(rows) && (rows as Record<string, unknown>[]).length === 1) {
            const row = rows[0] as Record<string, unknown>;
            const dc = (widget.displayConfig ?? {}) as Record<string, unknown>;
            const keys = Object.keys(row);

            // Find columns named "current_*" and "prev*_*"
            const currentKeys = keys.filter((k) => /^current[_\s]/i.test(k) && typeof row[k] === "number");
            const prevKeys = keys.filter((k) => /^prev(ious)?[_\s]/i.test(k) && typeof row[k] === "number");

            // Only update when there's exactly 1 "current" column — that's the
            // display value. If there are multiple (e.g. current_cost + current_clicks),
            // the AI did custom math (cost/clicks = CPC) that we can't replicate.
            const currentKey = currentKeys.length === 1 ? currentKeys[0]
              : currentKeys.length === 0 ? keys.find((k) => typeof row[k] === "number") // single-value result
              : null;
            const prevKey = prevKeys.length === 1 ? prevKeys[0] : null;

            if (currentKey && typeof row[currentKey] === "number") {
              const newValue = Number(row[currentKey]);
              const origValue = String(dc.value ?? "");
              const currPrefix = origValue.match(/^([A-Z]{1,3}\$?|[R€£¥₹₦₱₩₺₪฿])\s?/)?.[1] ?? "";
              const formatted = currPrefix
                ? `${currPrefix}${newValue.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(newValue) ? 0 : 2, maximumFractionDigits: 2 })}`
                : String(newValue);

              let change: string | undefined = dc.change as string | undefined;
              if (prevKey && typeof row[prevKey] === "number" && Number(row[prevKey]) !== 0) {
                const prevValue = Number(row[prevKey]);
                const pctChange = ((newValue - prevValue) / prevValue) * 100;
                const sign = pctChange >= 0 ? "+" : "";
                change = `${sign}${pctChange.toFixed(1)}%`;
              }

              console.log(`[dashboard-refresh] → BQ scorecard value: ${dc.value} → ${formatted}, change: ${dc.change} → ${change}`);
              updateData.displayConfig = { ...dc, value: formatted, change };
            }
          }

          await prisma.widget.update({
            where: { id: widget.id },
            data: updateData,
          });

          return {
            widgetId: widget.id,
            rows,
            // Send updated displayConfig back so the client can render it immediately
            ...(updateData.displayConfig ? { displayConfig: updateData.displayConfig } : {}),
          };
        } catch (err) {
          console.error(`[dashboard-refresh] Widget ${widget.id} failed:`, err);
          const errMsg = err instanceof Error ? err.message : "Query failed";

          // Log the error but don't mark data sources as disconnected —
          // individual widget query failures shouldn't affect the whole connection.

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
