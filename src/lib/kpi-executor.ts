import { prisma } from "@/lib/prisma";
import { runPropertyQuery } from "@/lib/bigquery";
import { getOrgDataSources } from "@/lib/org-access";

interface KpiRecord {
  id: string;
  metricQuery: string;
  timePeriod: string;
  cachedValue?: number | null;
  cachedData?: unknown;
  cachedAt?: Date | null;
}

function resolveDateRange(timePeriod: string): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 1); // yesterday (BQ data lag)

  const startDate = new Date(today);
  switch (timePeriod) {
    case "daily":
      startDate.setDate(startDate.getDate() - 1); // yesterday only
      break;
    case "weekly":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "monthly":
    default:
      startDate.setDate(startDate.getDate() - 30);
      break;
  }

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { startDate: fmt(startDate), endDate: fmt(endDate) };
}

interface OrgDataSourceInfo {
  propertyId: string;
  adsCustomerId: string | null;
  linkedInOrgId: string | null;
  mailchimpListId: string | null;
  gscSiteUrl: string | null;
  msAdsAccountId: string | null;
}

function resolveOrgDataSources(
  orgDataSources: Awaited<ReturnType<typeof getOrgDataSources>>
): OrgDataSourceInfo | null {
  const connectedStatuses = ["ACTIVE", "BACKFILLING", "ERROR"];
  const ga4Ds = orgDataSources.find(
    (ds) => ds.type === "GA4_BIGQUERY" && connectedStatuses.includes(ds.status)
  );
  if (!ga4Ds) return null;

  return {
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
  };
}

export interface KpiExecutionResult {
  kpiId: string;
  value: number | null;
  data: unknown;
  error?: string;
}

/** Execute a single KPI query and update its cached values */
export async function executeKpi(
  kpi: KpiRecord,
  dsInfo: OrgDataSourceInfo
): Promise<KpiExecutionResult> {
  try {
    const { startDate, endDate } = resolveDateRange(kpi.timePeriod);

    // Replace @startDate/@endDate placeholders in the SQL
    let sql = kpi.metricQuery;
    const params: Record<string, unknown> = {};
    if (sql.includes("@startDate")) {
      params.startDate = startDate;
    }
    if (sql.includes("@endDate")) {
      params.endDate = endDate;
    }

    const result = await runPropertyQuery(
      dsInfo.propertyId,
      sql,
      Object.keys(params).length > 0 ? params : undefined,
      dsInfo.adsCustomerId,
      dsInfo.linkedInOrgId,
      dsInfo.mailchimpListId,
      dsInfo.gscSiteUrl,
      dsInfo.msAdsAccountId
    );

    // Extract single numeric value from first row
    let value: number | null = null;
    if (Array.isArray(result.rows) && result.rows.length > 0) {
      const row = result.rows[0] as Record<string, unknown>;
      for (const v of Object.values(row)) {
        let unwrapped = v;
        // Unwrap BigQuery value objects
        if (
          unwrapped &&
          typeof unwrapped === "object" &&
          !Array.isArray(unwrapped) &&
          "value" in (unwrapped as Record<string, unknown>)
        ) {
          unwrapped = (unwrapped as Record<string, unknown>).value;
        }
        if (typeof unwrapped === "number") {
          value = unwrapped;
          break;
        }
        if (typeof unwrapped === "string" && !isNaN(Number(unwrapped))) {
          value = Number(unwrapped);
          break;
        }
      }
    }

    // Update cache on the KPI record
    await prisma.kpi.update({
      where: { id: kpi.id },
      data: {
        cachedValue: value,
        cachedData: result.rows as object ?? null,
        cachedAt: new Date(),
      },
    });

    return { kpiId: kpi.id, value, data: result.rows };
  } catch (err) {
    console.error(`[kpi-executor] KPI ${kpi.id} failed:`, err);
    const error = err instanceof Error ? err.message : "Query failed";
    return { kpiId: kpi.id, value: null, data: null, error };
  }
}

/** Refresh all KPIs for an organization */
export async function refreshOrgKpis(orgId: string): Promise<KpiExecutionResult[]> {
  const orgDataSources = await getOrgDataSources(orgId);
  const dsInfo = resolveOrgDataSources(orgDataSources);

  if (!dsInfo) {
    console.warn(`[kpi-executor] No GA4 data source found for org ${orgId}`);
    return [];
  }

  const kpis = await prisma.kpi.findMany({
    where: { orgId },
    orderBy: { sortOrder: "asc" },
  });

  if (kpis.length === 0) return [];

  const results = await Promise.all(kpis.map((kpi) => executeKpi(kpi, dsInfo)));
  return results;
}

/** Check if a KPI's cache is stale based on its time period */
export function isKpiStale(kpi: { timePeriod: string; cachedAt?: Date | null }): boolean {
  if (!kpi.cachedAt) return true;
  const now = Date.now();
  const age = now - new Date(kpi.cachedAt).getTime();
  const hours = age / (1000 * 60 * 60);

  switch (kpi.timePeriod) {
    case "daily":
      return hours > 4;
    case "weekly":
      return hours > 12;
    case "monthly":
    default:
      return hours > 24;
  }
}
