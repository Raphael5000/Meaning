import { BigQuery } from "@google-cloud/bigquery";
import { getAhrefsApiKey } from "@/lib/ahrefs-token";
import { safeDelete } from "@/lib/bq-helpers";
import {
  UnitMeter,
  getAhrefsQuota,
  maybeAlertOnQuota,
  invalidateQuotaCache,
  AHREFS_STOP_PCT,
} from "@/lib/ahrefs-usage";

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
  meter?: UnitMeter;
}

async function ahrefsGet({ apiKey, path, params, meter }: AhrefsApiOptions): Promise<unknown> {
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

  const json = await res.json();

  // Every request costs at least 50 units, so meter it whether or not it
  // returned rows. Row counts come from the first array-valued key.
  if (meter) {
    let rows = 1;
    if (json && typeof json === "object") {
      const arr = Object.values(json as Record<string, unknown>).find((v) => Array.isArray(v));
      if (Array.isArray(arr)) rows = arr.length;
    }
    meter.record(path, rows);
  }

  return json;
}

// ---------------------------------------------------------------------------
// Fetch cadence — the single biggest cost lever
// ---------------------------------------------------------------------------
//
// Ahrefs charges a 50-unit minimum per request, so cost is driven by *how often
// we call*, not by how much data we get back. Before this, every table was
// refetched on every sync run — twice a day from cron plus once on every server
// restart — which spent ~450 units per domain per run for data that had not
// changed. Each table now declares how stale it may get, and a table whose
// newest snapshot is still inside that window is not fetched at all.
//
// Cheap scalar endpoints stay daily. The row-priced endpoints (and Site Audit,
// which only changes when a crawl runs) move to weekly.

const CADENCE_CHEAP_DAYS = Number(process.env.AHREFS_CADENCE_CHEAP_DAYS ?? 1);
const CADENCE_EXPENSIVE_DAYS = Number(process.env.AHREFS_CADENCE_EXPENSIVE_DAYS ?? 7);

const TABLE_CADENCE_DAYS: Record<string, number> = {
  site_metrics: CADENCE_CHEAP_DAYS,
  domain_rating: CADENCE_CHEAP_DAYS,
  backlinks_stats: CADENCE_CHEAP_DAYS,
  organic_keywords: CADENCE_EXPENSIVE_DAYS,
  top_pages: CADENCE_EXPENSIVE_DAYS,
  referring_domains: CADENCE_EXPENSIVE_DAYS,
  site_audit_health: CADENCE_EXPENSIVE_DAYS,
  site_audit_issues: CADENCE_EXPENSIVE_DAYS,
};

// Row caps on the per-row-priced endpoints. At 39 units/row a 500-keyword pull
// costs 19,500 units — a fifth of the entire Lite monthly cap in one request.
const LIMIT_KEYWORDS = Number(process.env.AHREFS_LIMIT_KEYWORDS ?? 100);
const LIMIT_TOP_PAGES = Number(process.env.AHREFS_LIMIT_TOP_PAGES ?? 100);
const LIMIT_REFDOMAINS = Number(process.env.AHREFS_LIMIT_REFDOMAINS ?? 200);

const SNAPSHOT_TABLES = Object.keys(TABLE_CADENCE_DAYS);

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Newest snapshot_date already stored for each partitioned table, in one query.
 *
 * A missing/failed lookup returns an empty map, which makes every table look
 * stale — we fetch rather than silently skip, so a BigQuery hiccup can never
 * leave a domain permanently un-synced.
 */
async function getSnapshotFreshness(
  bq: BigQuery,
  projectId: string,
  datasetId: string,
): Promise<Map<string, string>> {
  const freshness = new Map<string, string>();
  const sql = SNAPSHOT_TABLES.map(
    (t) =>
      `SELECT '${t}' AS tbl, CAST(MAX(snapshot_date) AS STRING) AS max_date FROM \`${projectId}.${datasetId}.${t}\``,
  ).join("\nUNION ALL\n");

  try {
    const [rows] = await bq.query({ query: sql });
    for (const r of rows as Array<{ tbl: string; max_date: string | null }>) {
      if (r.max_date) freshness.set(r.tbl, r.max_date);
    }
  } catch (err) {
    console.warn(
      "[ahrefs-sync] Freshness lookup failed — treating all tables as stale:",
      (err as Error).message,
    );
  }

  return freshness;
}

// ---------------------------------------------------------------------------
// management/projects cache
// ---------------------------------------------------------------------------
//
// The project list is workspace-wide and near-static, but was being fetched
// once per domain per run (5 domains × 2 runs = 10 identical 50-unit calls a
// day). Cache it per process so a batch issues one call, and refresh on a long
// interval.

const PROJECTS_TTL_MS = Number(process.env.AHREFS_PROJECTS_TTL_MS ?? 6 * 60 * 60 * 1000);

interface AhrefsProject {
  project_id: string;
  url?: string;
}

const _projectsCache = new Map<string, { at: number; projects: AhrefsProject[] }>();

async function getAhrefsProjects(
  apiKey: string,
  meter?: UnitMeter,
): Promise<AhrefsProject[]> {
  const cached = _projectsCache.get(apiKey);
  if (cached && Date.now() - cached.at < PROJECTS_TTL_MS) {
    return cached.projects;
  }

  const data = (await ahrefsGet({
    apiKey,
    path: "/management/projects",
    params: { output: "json" },
    meter,
  })) as { projects?: AhrefsProject[] };

  const projects = data.projects ?? [];
  _projectsCache.set(apiKey, { at: Date.now(), projects });
  return projects;
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
  /** Tables left alone because their newest snapshot is still inside cadence. */
  skippedTables: string[];
  /** Estimated Ahrefs units spent by this run. */
  unitsSpent: number;
  /** Set when the run was abandoned before any API call (quota exhausted). */
  quotaBlocked?: boolean;
}

export interface AhrefsSyncOptions {
  /** Bypass the cadence gate and refetch everything. Manual resyncs only. */
  force?: boolean;
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
  opts: AhrefsSyncOptions = {},
): Promise<AhrefsSyncResult> {
  const apiKey = await getAhrefsApiKey(userId);
  if (!apiKey) throw new Error(`No Ahrefs API key for user ${userId}`);

  const meter = new UnitMeter();
  const emptyResult = (extra: Partial<AhrefsSyncResult> = {}): AhrefsSyncResult => ({
    siteMetricsRows: 0,
    domainRatingRows: 0,
    backlinksStatsRows: 0,
    organicKeywordsRows: 0,
    topPagesRows: 0,
    referringDomainsRows: 0,
    siteAuditHealthRows: 0,
    siteAuditIssuesRows: 0,
    skippedTables: [],
    unitsSpent: 0,
    ...extra,
  });

  // ── Budget guard ──
  // The quota endpoint is free, so this costs nothing and runs before any
  // billable call. Stopping short of the cap keeps headroom for the rest of
  // the workspace (ad-hoc research, the Claude/MCP integration) instead of
  // letting the cron consume every last unit.
  const quota = await getAhrefsQuota(apiKey);
  await maybeAlertOnQuota(quota);
  if (quota && quota.pct >= AHREFS_STOP_PCT) {
    console.warn(
      `[ahrefs-sync] SKIPPING ${domain} — workspace at ${quota.pct.toFixed(1)}% of ` +
        `${quota.limit.toLocaleString()} units (resets ${quota.resetDate ?? "unknown"})`,
    );
    return emptyResult({ quotaBlocked: true });
  }

  // Use orgId-based dataset; the domain is the propertyId
  // We need to look up the orgId from the DataSource
  const { prisma } = await import("@/lib/prisma");
  const ds = await prisma.dataSource.findFirst({
    where: { userId, type: "AHREFS", propertyId: domain },
    select: { id: true, orgId: true, bigqueryDataset: true },
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

  // Per-source config lives as JSON in the bigqueryDataset column:
  //   {"country":"US","siteAuditProjectId":"1234"}
  let country: string | undefined;
  let cachedProjectId: string | undefined;
  try {
    if (ds?.bigqueryDataset) {
      const config = JSON.parse(ds.bigqueryDataset);
      country = config.country;
      cachedProjectId = config.siteAuditProjectId;
    }
  } catch {
    // Malformed or absent config — fall back to global scope
  }

  // ── Cadence gate ──
  // Ahrefs snapshots are immutable once written: hivory.io on 2026-07-21 never
  // changes. A table whose newest snapshot is still inside its cadence window
  // is skipped outright, so restart-triggered and retry-window runs cost zero
  // units instead of repaying the full ~450-unit-per-domain bill.
  const freshness = opts.force
    ? new Map<string, string>()
    : await getSnapshotFreshness(bq, projectId, datasetId);

  const skippedTables: string[] = [];
  // Every endpoint below is individually non-fatal, so a wholesale outage (an
  // expired key, or a 403 "API units limit reached") used to return all-zeros
  // without throwing — and syncWithRetry then marked the source ACTIVE. That is
  // how these domains reported a green sync every day from 21 Jul onwards while
  // nothing reached BigQuery. Collect failures so a run in which *everything*
  // failed is raised as an error instead of passing silently.
  const failures: string[] = [];

  const needsFetch = (table: string): boolean => {
    if (opts.force) return true;
    const last = freshness.get(table);
    const cadence = TABLE_CADENCE_DAYS[table] ?? 1;
    if (!last || daysBetween(last, today) >= cadence) return true;
    skippedTables.push(table);
    return false;
  };

  const baseParams: Record<string, string> = {
    target: domain,
    mode: "subdomains",
    output: "json",
    date: today,
  };
  if (country) baseParams.country = country;

  // ── 1. Site metrics (50 units) ──
  let siteMetricsRows: Record<string, unknown>[] = [];
  if (needsFetch("site_metrics")) try {
    const data = (await ahrefsGet({
      apiKey,
      path: "/site-explorer/metrics",
      params: baseParams,
      meter,
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
    failures.push(`site_metrics: ${(err as Error).message}`);
    console.warn(`[ahrefs-sync] Site metrics fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 2. Domain rating (50 units) ──
  let domainRatingRows: Record<string, unknown>[] = [];
  if (needsFetch("domain_rating")) try {
    const data = (await ahrefsGet({
      apiKey,
      path: "/site-explorer/domain-rating",
      params: { target: domain, date: today, output: "json" },
      meter,
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
    failures.push(`domain_rating: ${(err as Error).message}`);
    console.warn(`[ahrefs-sync] Domain rating fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 3. Backlinks stats (50 units) ──
  let backlinksStatsRows: Record<string, unknown>[] = [];
  if (needsFetch("backlinks_stats")) try {
    const data = (await ahrefsGet({
      apiKey,
      path: "/site-explorer/backlinks-stats",
      params: { target: domain, date: today, output: "json" },
      meter,
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
    failures.push(`backlinks_stats: ${(err as Error).message}`);
    console.warn(`[ahrefs-sync] Backlinks stats fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 4. Organic keywords (39 units/row — the most expensive endpoint) ──
  let organicKeywordsRows: Record<string, unknown>[] = [];
  if (needsFetch("organic_keywords")) try {
    const data = (await ahrefsGet({
      apiKey,
      path: "/site-explorer/organic-keywords",
      params: {
        ...baseParams,
        select: "keyword,best_position,volume,sum_traffic,cpc,keyword_difficulty,best_position_url,best_position_kind,is_branded,is_informational,is_commercial,is_transactional",
        order_by: "sum_traffic:desc",
        limit: String(LIMIT_KEYWORDS),
      },
      meter,
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
    failures.push(`organic_keywords: ${(err as Error).message}`);
    console.warn(`[ahrefs-sync] Organic keywords fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 5. Top pages (25 units/row) ──
  let topPagesRows: Record<string, unknown>[] = [];
  if (needsFetch("top_pages")) try {
    const data = (await ahrefsGet({
      apiKey,
      path: "/site-explorer/top-pages",
      params: {
        ...baseParams,
        select: "url,keywords,sum_traffic,value,top_keyword,top_keyword_best_position,ur",
        order_by: "sum_traffic:desc",
        limit: String(LIMIT_TOP_PAGES),
      },
      meter,
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
    failures.push(`top_pages: ${(err as Error).message}`);
    console.warn(`[ahrefs-sync] Top pages fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 6. Referring domains (17 units/row) ──
  let referringDomainsRows: Record<string, unknown>[] = [];
  if (needsFetch("referring_domains")) try {
    const data = (await ahrefsGet({
      apiKey,
      // NB: the v3 path is /refdomains. /referring-domains 404s — which is why
      // this table had never received a single row.
      path: "/site-explorer/refdomains",
      params: {
        target: domain,
        mode: "subdomains",
        output: "json",
        select: "domain,domain_rating,dofollow_links,links_to_target,traffic_domain,first_seen,last_seen,is_spam",
        order_by: "traffic_domain:desc",
        limit: String(LIMIT_REFDOMAINS),
        history: "live",
      },
      meter,
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
    failures.push(`refdomains: ${(err as Error).message}`);
    console.warn(`[ahrefs-sync] Referring domains fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 7. Site Audit — health score + issues ──
  // Audit data only changes when a crawl runs, so both tables sit on the slow
  // cadence and the project_id lookup is resolved once and then persisted.
  let siteAuditHealthRows: Record<string, unknown>[] = [];
  let siteAuditIssuesRows: Record<string, unknown>[] = [];
  const wantAuditHealth = needsFetch("site_audit_health");
  const wantAuditIssues = needsFetch("site_audit_issues");

  if (wantAuditHealth || wantAuditIssues) try {
    let resolvedProjectId = cachedProjectId;

    if (!resolvedProjectId) {
      // Workspace-wide and near-static — cached per process so a batch of
      // domains issues one call instead of one per domain.
      const projects = await getAhrefsProjects(apiKey, meter);

      // Match domain to project (strip protocol + trailing slash for comparison)
      const cleanTarget = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
      const matchedProject = projects.find((p) => {
        const pUrl = (p.url ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
        return pUrl === cleanTarget || pUrl === `www.${cleanTarget}` || `www.${pUrl}` === cleanTarget;
      });
      resolvedProjectId = matchedProject?.project_id;

      // Persist so subsequent runs skip the lookup entirely
      if (resolvedProjectId && ds) {
        await prisma.dataSource
          .update({
            where: { id: ds.id },
            data: {
              bigqueryDataset: JSON.stringify({
                ...(country ? { country } : {}),
                siteAuditProjectId: resolvedProjectId,
              }),
            },
          })
          .catch(() => {});
      }
    }

    if (resolvedProjectId) {
      const pid = String(parseInt(resolvedProjectId, 10));

      // 7a. Health score from site-audit/projects
      if (wantAuditHealth) {
        const healthData = (await ahrefsGet({
          apiKey,
          path: "/site-audit/projects",
          params: { project_id: pid, output: "json" },
          meter,
        })) as { healthscores?: Array<Record<string, unknown>> };

        const hs = healthData.healthscores?.[0];
        if (hs) {
          siteAuditHealthRows = [{
            snapshot_date: today,
            project_id: resolvedProjectId,
            health_score: hs.health_score ?? null,
            total_urls: hs.total ?? null,
            urls_with_errors: hs.urls_with_errors ?? null,
            urls_with_warnings: hs.urls_with_warnings ?? null,
            urls_with_notices: hs.urls_with_notices ?? null,
          }];
        }
      }

      // 7b. Issues list from site-audit/issues
      if (wantAuditIssues) {
        const issuesData = (await ahrefsGet({
          apiKey,
          path: "/site-audit/issues",
          params: { project_id: pid, output: "json" },
          meter,
        })) as { issues?: Array<Record<string, unknown>> };

        for (const issue of issuesData.issues ?? []) {
          siteAuditIssuesRows.push({
            snapshot_date: today,
            project_id: resolvedProjectId,
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
      }
    } else {
      console.log(`[ahrefs-sync] No Site Audit project found for ${domain} — skipping audit data`);
    }
  } catch (err) {
    failures.push(`site_audit: ${(err as Error).message}`);
    console.warn(`[ahrefs-sync] Site Audit fetch failed (non-fatal):`, (err as Error).message);
  }

  if (skippedTables.length > 0) {
    console.log(
      `[ahrefs-sync] ${domain}: skipped ${skippedTables.length} table(s) still inside cadence — ${skippedTables.join(", ")}`
    );
  }

  // The meter only records requests that actually returned, so zero requests
  // alongside at least one failure means nothing worked at all: a broken
  // connector, not a quiet run. Throw so syncWithRetry marks the source ERROR
  // and the admin alert fires, instead of reporting a green sync that moved no
  // data — the failure mode that hid this outage for two weeks.
  if (failures.length > 0 && meter.requests === 0) {
    throw new Error(
      `All ${failures.length} attempted Ahrefs endpoint(s) failed for ${domain} — ${failures[0]}`,
    );
  }

  console.log(
    `[ahrefs-sync] Fetched: ${siteMetricsRows.length} metrics, ${domainRatingRows.length} DR, ${backlinksStatsRows.length} backlinks, ${organicKeywordsRows.length} keywords, ${topPagesRows.length} pages, ${referringDomainsRows.length} refdomains, ${siteAuditHealthRows.length} audit health, ${siteAuditIssuesRows.length} audit issues`
  );
  console.log(`[ahrefs-sync] ${domain}: ~${meter.summary()}`);

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

  // Site info — only rewritten when we actually pulled something, so a run
  // that was fully served by the cadence gate touches nothing at all.
  if (meter.requests > 0) {
    const siteInfoRows = [
      {
        target_domain: domain,
        country: country ?? "global",
        last_synced_at: new Date().toISOString(),
      },
    ];
    await safeDelete(bq, `DELETE FROM ${fqDataset}.site_info WHERE TRUE`, "ahrefs-sync");
    insertTasks.push(dataset.table("site_info").insert(siteInfoRows));
  }

  await Promise.all(insertTasks);

  // A run that spent units invalidates the cached quota so the next domain in
  // the batch reads a current figure rather than a stale one.
  if (meter.units > 0) invalidateQuotaCache();

  console.log(`[ahrefs-sync] Sync complete for ${domain} (~${meter.units} units)`);
  return {
    siteMetricsRows: siteMetricsRows.length,
    domainRatingRows: domainRatingRows.length,
    backlinksStatsRows: backlinksStatsRows.length,
    organicKeywordsRows: organicKeywordsRows.length,
    topPagesRows: topPagesRows.length,
    referringDomainsRows: referringDomainsRows.length,
    siteAuditHealthRows: siteAuditHealthRows.length,
    siteAuditIssuesRows: siteAuditIssuesRows.length,
    skippedTables,
    unitsSpent: meter.units,
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
