import { BigQuery } from "@google-cloud/bigquery";
import { getAhrefsApiKey } from "@/lib/ahrefs-token";
import { safeDelete } from "@/lib/bq-helpers";

// ---------------------------------------------------------------------------
// Client singletons
// ---------------------------------------------------------------------------

let _bqClient: BigQuery | null = null;

function getBqClient(): BigQuery {
  if (_bqClient) return _bqClient;
  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS env var is not set");
  const credentials = JSON.parse(raw);
  _bqClient = new BigQuery({ projectId: credentials.project_id, credentials });
  return _bqClient;
}

function getProjectId(): string {
  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS env var is not set");
  return JSON.parse(raw).project_id;
}

// ---------------------------------------------------------------------------
// Dataset helpers
// ---------------------------------------------------------------------------

export function getAhrefsDataset(orgId: string): string {
  return `ahrefs_${orgId.replace(/[^a-zA-Z0-9]/g, "")}`;
}

export async function ensureDataset(datasetId: string): Promise<void> {
  const bq = getBqClient();
  const dataset = bq.dataset(datasetId);
  const [exists] = await dataset.exists();
  if (!exists) {
    let location = "EU";
    try {
      const [meta] = await bq.dataset("dbt_meaning").getMetadata();
      location = meta.location || "EU";
    } catch {
      /* Default to EU */
    }
    await bq.createDataset(datasetId, { location });
    console.log(`[ahrefs-transfer] Created dataset: ${datasetId} in ${location}`);
  }
}

// ---------------------------------------------------------------------------
// Table schemas
// ---------------------------------------------------------------------------

const TABLE_SCHEMAS: Record<
  string,
  { fields: { name: string; type: string }[]; partition?: string }
> = {
  site_metrics: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "org_keywords", type: "INT64" },
      { name: "org_keywords_1_3", type: "INT64" },
      { name: "org_traffic", type: "INT64" },
      { name: "org_cost", type: "INT64" },
      { name: "paid_keywords", type: "INT64" },
      { name: "paid_traffic", type: "INT64" },
      { name: "paid_cost", type: "INT64" },
      { name: "paid_pages", type: "INT64" },
    ],
  },
  domain_rating: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "domain_rating", type: "FLOAT64" },
      { name: "ahrefs_rank", type: "INT64" },
    ],
  },
  backlinks_stats: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "live_backlinks", type: "INT64" },
      { name: "all_time_backlinks", type: "INT64" },
      { name: "live_refdomains", type: "INT64" },
      { name: "all_time_refdomains", type: "INT64" },
    ],
  },
  organic_keywords: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "keyword", type: "STRING" },
      { name: "best_position", type: "INT64" },
      { name: "volume", type: "INT64" },
      { name: "sum_traffic", type: "INT64" },
      { name: "cpc", type: "INT64" },
      { name: "keyword_difficulty", type: "INT64" },
      { name: "best_position_url", type: "STRING" },
      { name: "best_position_kind", type: "STRING" },
      { name: "is_branded", type: "BOOLEAN" },
      { name: "is_informational", type: "BOOLEAN" },
      { name: "is_commercial", type: "BOOLEAN" },
      { name: "is_transactional", type: "BOOLEAN" },
    ],
  },
  top_pages: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "url", type: "STRING" },
      { name: "keywords", type: "INT64" },
      { name: "sum_traffic", type: "INT64" },
      { name: "value", type: "INT64" },
      { name: "top_keyword", type: "STRING" },
      { name: "top_keyword_best_position", type: "INT64" },
      { name: "ur", type: "FLOAT64" },
    ],
  },
  referring_domains: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "domain", type: "STRING" },
      { name: "domain_rating", type: "FLOAT64" },
      { name: "dofollow_links", type: "INT64" },
      { name: "links_to_target", type: "INT64" },
      { name: "traffic_domain", type: "INT64" },
      { name: "first_seen", type: "TIMESTAMP" },
      { name: "last_seen", type: "TIMESTAMP" },
      { name: "is_spam", type: "BOOLEAN" },
    ],
  },
  site_audit_health: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "project_id", type: "STRING" },
      { name: "health_score", type: "INT64" },
      { name: "total_urls", type: "INT64" },
      { name: "urls_with_errors", type: "INT64" },
      { name: "urls_with_warnings", type: "INT64" },
      { name: "urls_with_notices", type: "INT64" },
    ],
  },
  site_audit_issues: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "project_id", type: "STRING" },
      { name: "issue_id", type: "STRING" },
      { name: "name", type: "STRING" },
      { name: "importance", type: "STRING" },
      { name: "category", type: "STRING" },
      { name: "crawled", type: "INT64" },
      { name: "change", type: "INT64" },
      { name: "added", type: "INT64" },
      { name: "removed", type: "INT64" },
    ],
  },
  site_info: {
    fields: [
      { name: "target_domain", type: "STRING" },
      { name: "country", type: "STRING" },
      { name: "last_synced_at", type: "TIMESTAMP" },
    ],
  },
};

export const AHREFS_KEY_COLUMNS: Record<string, string[]> = {
  site_metrics: ["snapshot_date"],
  domain_rating: ["snapshot_date"],
  backlinks_stats: ["snapshot_date"],
  organic_keywords: ["snapshot_date", "keyword"],
  top_pages: ["snapshot_date", "url"],
  referring_domains: ["snapshot_date", "domain"],
  site_audit_health: ["snapshot_date", "project_id"],
  site_audit_issues: ["snapshot_date", "project_id", "issue_id"],
  site_info: ["target_domain"],
};

// ---------------------------------------------------------------------------
// Table management
// ---------------------------------------------------------------------------

export async function ensureAhrefsTables(datasetId: string): Promise<void> {
  const bq = getBqClient();
  const dataset = bq.dataset(datasetId);

  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    const table = dataset.table(tableName);
    const [exists] = await table.exists();
    if (exists) continue;

    const options: Record<string, unknown> = {
      schema: { fields: schema.fields },
    };

    if (schema.partition) {
      options.timePartitioning = {
        type: "DAY",
        field: schema.partition,
      };
    }

    await table.create(options);
    console.log(`[ahrefs-transfer] Created table: ${datasetId}.${tableName}`);
  }
}

// ---------------------------------------------------------------------------
// Ahrefs API helpers
// ---------------------------------------------------------------------------

const AHREFS_API_BASE = "https://api.ahrefs.com/v3";

interface AhrefsApiOptions {
  apiKey: string;
  path: string;
  params?: Record<string, string>;
}

async function ahrefsGet({ apiKey, path, params }: AhrefsApiOptions): Promise<unknown> {
  const url = new URL(`${AHREFS_API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ahrefs API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Sync orchestrator
// ---------------------------------------------------------------------------

export interface AhrefsSyncResult {
  siteMetricsRows: number;
  domainRatingRows: number;
  backlinksStatsRows: number;
  organicKeywordsRows: number;
  topPagesRows: number;
  referringDomainsRows: number;
  siteAuditHealthRows: number;
  siteAuditIssuesRows: number;
}

/**
 * Sync Ahrefs data into BigQuery for a given domain.
 *
 * The propertyId for AHREFS data sources stores the target domain (e.g. "example.com").
 * The optional country param scopes organic data to a specific market.
 */
export async function syncAhrefsData(
  userId: string,
  domain: string,
  _startDate?: string,
  _endDate?: string,
): Promise<AhrefsSyncResult> {
  const apiKey = await getAhrefsApiKey(userId);
  if (!apiKey) throw new Error(`No Ahrefs API key for user ${userId}`);

  // Use orgId-based dataset; the domain is the propertyId
  // We need to look up the orgId from the DataSource
  const { prisma } = await import("@/lib/prisma");
  const ds = await prisma.dataSource.findFirst({
    where: { userId, type: "AHREFS", propertyId: domain },
    select: { orgId: true },
  });
  const orgId = ds?.orgId ?? userId;
  const datasetId = getAhrefsDataset(orgId);

  const bq = getBqClient();
  const projectId = getProjectId();

  // Ahrefs data is point-in-time; use today's date for snapshots
  const today = new Date().toISOString().split("T")[0];

  console.log(`[ahrefs-sync] Starting sync for ${domain}, snapshot ${today}`);

  await ensureDataset(datasetId);
  await ensureAhrefsTables(datasetId);

  // Determine country from DS config (stored as JSON in bigqueryDataset field)
  let country: string | undefined;
  try {
    if (ds) {
      const fullDs = await prisma.dataSource.findFirst({
        where: { userId, type: "AHREFS", propertyId: domain },
        select: { bigqueryDataset: true },
      });
      // We store country in bigqueryDataset as JSON: {"country":"US"}
      if (fullDs?.bigqueryDataset) {
        const config = JSON.parse(fullDs.bigqueryDataset);
        country = config.country;
      }
    }
  } catch {
    // No country config, use global
  }

  const baseParams: Record<string, string> = {
    target: domain,
    mode: "subdomains",
    output: "json",
    date: today,
  };
  if (country) baseParams.country = country;

  // ── 1. Site metrics (cheap: 1 call) ──
  let siteMetricsRows: Record<string, unknown>[] = [];
  try {
    const data = (await ahrefsGet({
      apiKey,
      path: "/site-explorer/metrics",
      params: baseParams,
    })) as { metrics?: Record<string, number> };

    const m = data.metrics;
    if (m) {
      siteMetricsRows = [
        {
          snapshot_date: today,
          org_keywords: m.org_keywords ?? 0,
          org_keywords_1_3: m.org_keywords_1_3 ?? 0,
          org_traffic: m.org_traffic ?? 0,
          org_cost: m.org_cost ?? 0,
          paid_keywords: m.paid_keywords ?? 0,
          paid_traffic: m.paid_traffic ?? 0,
          paid_cost: m.paid_cost ?? 0,
          paid_pages: m.paid_pages ?? 0,
        },
      ];
    }
  } catch (err) {
    console.warn(`[ahrefs-sync] Site metrics fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 2. Domain rating (cheap: 1 call) ──
  let domainRatingRows: Record<string, unknown>[] = [];
  try {
    const data = (await ahrefsGet({
      apiKey,
      path: "/site-explorer/domain-rating",
      params: { target: domain, date: today, output: "json" },
    })) as { domain_rating?: { domain_rating?: number; ahrefs_rank?: number } };

    const dr = data.domain_rating;
    if (dr) {
      domainRatingRows = [
        {
          snapshot_date: today,
          domain_rating: dr.domain_rating ?? 0,
          ahrefs_rank: dr.ahrefs_rank ?? 0,
        },
      ];
    }
  } catch (err) {
    console.warn(`[ahrefs-sync] Domain rating fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 3. Backlinks stats (cheap: 1 call) ──
  let backlinksStatsRows: Record<string, unknown>[] = [];
  try {
    const data = (await ahrefsGet({
      apiKey,
      path: "/site-explorer/backlinks-stats",
      params: { target: domain, date: today, output: "json" },
    })) as { metrics?: Record<string, number> };

    const m = data.metrics;
    if (m) {
      backlinksStatsRows = [
        {
          snapshot_date: today,
          live_backlinks: m.live ?? 0,
          all_time_backlinks: m.all_time ?? 0,
          live_refdomains: m.live_refdomains ?? 0,
          all_time_refdomains: m.all_time_refdomains ?? 0,
        },
      ];
    }
  } catch (err) {
    console.warn(`[ahrefs-sync] Backlinks stats fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 4. Organic keywords (top 500 by traffic) ──
  let organicKeywordsRows: Record<string, unknown>[] = [];
  try {
    const data = (await ahrefsGet({
      apiKey,
      path: "/site-explorer/organic-keywords",
      params: {
        ...baseParams,
        select: "keyword,best_position,volume,sum_traffic,cpc,keyword_difficulty,best_position_url,best_position_kind,is_branded,is_informational,is_commercial,is_transactional",
        order_by: "sum_traffic:desc",
        limit: "500",
      },
    })) as { keywords?: Record<string, unknown>[] };

    for (const kw of data.keywords ?? []) {
      organicKeywordsRows.push({
        snapshot_date: today,
        keyword: kw.keyword ?? "",
        best_position: kw.best_position ?? null,
        volume: kw.volume ?? null,
        sum_traffic: kw.sum_traffic ?? null,
        cpc: kw.cpc ?? null,
        keyword_difficulty: kw.keyword_difficulty ?? null,
        best_position_url: kw.best_position_url ?? null,
        best_position_kind: kw.best_position_kind ?? null,
        is_branded: kw.is_branded ?? false,
        is_informational: kw.is_informational ?? false,
        is_commercial: kw.is_commercial ?? false,
        is_transactional: kw.is_transactional ?? false,
      });
    }
  } catch (err) {
    console.warn(`[ahrefs-sync] Organic keywords fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 5. Top pages (top 100 by traffic) ──
  let topPagesRows: Record<string, unknown>[] = [];
  try {
    const data = (await ahrefsGet({
      apiKey,
      path: "/site-explorer/top-pages",
      params: {
        ...baseParams,
        select: "url,keywords,sum_traffic,value,top_keyword,top_keyword_best_position,ur",
        order_by: "sum_traffic:desc",
        limit: "100",
      },
    })) as { pages?: Record<string, unknown>[] };

    for (const page of data.pages ?? []) {
      topPagesRows.push({
        snapshot_date: today,
        url: page.url ?? "",
        keywords: page.keywords ?? 0,
        sum_traffic: page.sum_traffic ?? 0,
        value: page.value ?? 0,
        top_keyword: page.top_keyword ?? null,
        top_keyword_best_position: page.top_keyword_best_position ?? null,
        ur: page.ur ?? null,
      });
    }
  } catch (err) {
    console.warn(`[ahrefs-sync] Top pages fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 6. Referring domains (top 200 by traffic) ──
  let referringDomainsRows: Record<string, unknown>[] = [];
  try {
    const data = (await ahrefsGet({
      apiKey,
      path: "/site-explorer/referring-domains",
      params: {
        target: domain,
        mode: "subdomains",
        output: "json",
        select: "domain,domain_rating,dofollow_links,links_to_target,traffic_domain,first_seen,last_seen,is_spam",
        order_by: "traffic_domain:desc",
        limit: "200",
        history: "live",
      },
    })) as { refdomains?: Record<string, unknown>[] };

    for (const rd of data.refdomains ?? []) {
      referringDomainsRows.push({
        snapshot_date: today,
        domain: rd.domain ?? "",
        domain_rating: rd.domain_rating ?? 0,
        dofollow_links: rd.dofollow_links ?? 0,
        links_to_target: rd.links_to_target ?? 0,
        traffic_domain: rd.traffic_domain ?? 0,
        first_seen: rd.first_seen ?? null,
        last_seen: rd.last_seen ?? null,
        is_spam: rd.is_spam ?? false,
      });
    }
  } catch (err) {
    console.warn(`[ahrefs-sync] Referring domains fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 7. Site Audit — health score + issues ──
  // Look up the project_id for this domain from management/projects
  let siteAuditHealthRows: Record<string, unknown>[] = [];
  let siteAuditIssuesRows: Record<string, unknown>[] = [];
  try {
    const projectsData = (await ahrefsGet({
      apiKey,
      path: "/management/projects",
      params: { output: "json" },
    })) as { projects?: Array<{ project_id: string; url?: string }> };

    // Match domain to project (strip protocol + trailing slash for comparison)
    const cleanTarget = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
    const matchedProject = (projectsData.projects ?? []).find((p) => {
      const pUrl = (p.url ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
      return pUrl === cleanTarget || pUrl === `www.${cleanTarget}` || `www.${pUrl}` === cleanTarget;
    });

    if (matchedProject) {
      const pid = parseInt(matchedProject.project_id, 10);

      // 7a. Health score from site-audit/projects
      const healthData = (await ahrefsGet({
        apiKey,
        path: "/site-audit/projects",
        params: { project_id: String(pid), output: "json" },
      })) as { healthscores?: Array<Record<string, unknown>> };

      const hs = healthData.healthscores?.[0];
      if (hs) {
        siteAuditHealthRows = [{
          snapshot_date: today,
          project_id: matchedProject.project_id,
          health_score: hs.health_score ?? null,
          total_urls: hs.total ?? null,
          urls_with_errors: hs.urls_with_errors ?? null,
          urls_with_warnings: hs.urls_with_warnings ?? null,
          urls_with_notices: hs.urls_with_notices ?? null,
        }];
      }

      // 7b. Issues list from site-audit/issues
      const issuesData = (await ahrefsGet({
        apiKey,
        path: "/site-audit/issues",
        params: { project_id: String(pid), output: "json" },
      })) as { issues?: Array<Record<string, unknown>> };

      for (const issue of issuesData.issues ?? []) {
        siteAuditIssuesRows.push({
          snapshot_date: today,
          project_id: matchedProject.project_id,
          issue_id: issue.issue_id ?? "",
          name: issue.name ?? "",
          importance: issue.importance ?? "",
          category: issue.category ?? "",
          crawled: issue.crawled ?? 0,
          change: issue.change ?? null,
          added: issue.added ?? null,
          removed: issue.removed ?? null,
        });
      }
    } else {
      console.log(`[ahrefs-sync] No Site Audit project found for ${domain} — skipping audit data`);
    }
  } catch (err) {
    console.warn(`[ahrefs-sync] Site Audit fetch failed (non-fatal):`, (err as Error).message);
  }

  console.log(
    `[ahrefs-sync] Fetched: ${siteMetricsRows.length} metrics, ${domainRatingRows.length} DR, ${backlinksStatsRows.length} backlinks, ${organicKeywordsRows.length} keywords, ${topPagesRows.length} pages, ${referringDomainsRows.length} refdomains, ${siteAuditHealthRows.length} audit health, ${siteAuditIssuesRows.length} audit issues`
  );

  // ── Write to BigQuery ──
  const fqDataset = `\`${projectId}.${datasetId}\``;
  const dataset = bq.dataset(datasetId);
  const insertTasks: Promise<unknown>[] = [];

  if (siteMetricsRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.site_metrics WHERE snapshot_date = '${today}'`, "ahrefs-sync");
    if (ok) insertTasks.push(dataset.table("site_metrics").insert(siteMetricsRows));
  }
  if (domainRatingRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.domain_rating WHERE snapshot_date = '${today}'`, "ahrefs-sync");
    if (ok) insertTasks.push(dataset.table("domain_rating").insert(domainRatingRows));
  }
  if (backlinksStatsRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.backlinks_stats WHERE snapshot_date = '${today}'`, "ahrefs-sync");
    if (ok) insertTasks.push(dataset.table("backlinks_stats").insert(backlinksStatsRows));
  }
  if (organicKeywordsRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.organic_keywords WHERE snapshot_date = '${today}'`, "ahrefs-sync");
    if (ok) insertTasks.push(dataset.table("organic_keywords").insert(organicKeywordsRows));
  }
  if (topPagesRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.top_pages WHERE snapshot_date = '${today}'`, "ahrefs-sync");
    if (ok) insertTasks.push(dataset.table("top_pages").insert(topPagesRows));
  }
  if (referringDomainsRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.referring_domains WHERE snapshot_date = '${today}'`, "ahrefs-sync");
    if (ok) insertTasks.push(dataset.table("referring_domains").insert(referringDomainsRows));
  }

  if (siteAuditHealthRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.site_audit_health WHERE snapshot_date = '${today}'`, "ahrefs-sync");
    if (ok) insertTasks.push(dataset.table("site_audit_health").insert(siteAuditHealthRows));
  }
  if (siteAuditIssuesRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.site_audit_issues WHERE snapshot_date = '${today}'`, "ahrefs-sync");
    if (ok) insertTasks.push(dataset.table("site_audit_issues").insert(siteAuditIssuesRows));
  }

  // Site info (always overwrite)
  const siteInfoRows = [
    {
      target_domain: domain,
      country: country ?? "global",
      last_synced_at: new Date().toISOString(),
    },
  ];
  await safeDelete(bq, `DELETE FROM ${fqDataset}.site_info WHERE TRUE`, "ahrefs-sync");
  insertTasks.push(dataset.table("site_info").insert(siteInfoRows));

  await Promise.all(insertTasks);

  console.log(`[ahrefs-sync] Sync complete for ${domain}`);
  return {
    siteMetricsRows: siteMetricsRows.length,
    domainRatingRows: domainRatingRows.length,
    backlinksStatsRows: backlinksStatsRows.length,
    organicKeywordsRows: organicKeywordsRows.length,
    topPagesRows: topPagesRows.length,
    referringDomainsRows: referringDomainsRows.length,
    siteAuditHealthRows: siteAuditHealthRows.length,
    siteAuditIssuesRows: siteAuditIssuesRows.length,
  };
}

// ---------------------------------------------------------------------------
// Data status check
// ---------------------------------------------------------------------------

export interface AhrefsDataStatus {
  datasetId: string;
  hasData: boolean;
  tables: string[];
}

export async function checkAhrefsDataStatus(
  orgId: string
): Promise<AhrefsDataStatus> {
  const bq = getBqClient();
  const datasetId = getAhrefsDataset(orgId);

  try {
    const dataset = bq.dataset(datasetId);
    const [exists] = await dataset.exists();
    if (!exists) {
      return { datasetId, hasData: false, tables: [] };
    }

    const [tables] = await dataset.getTables();
    const tableNames = tables.map((t) => t.id || "").filter(Boolean);
    const expectedTables = Object.keys(TABLE_SCHEMAS);
    const hasExpected = expectedTables.some((t) => tableNames.includes(t));
    return { datasetId, hasData: hasExpected, tables: tableNames };
  } catch {
    return { datasetId, hasData: false, tables: [] };
  }
}
