import { BigQuery } from "@google-cloud/bigquery";
import { getValidGoogleTokenForUser } from "@/lib/google-token";

// ---------------------------------------------------------------------------
// Client singletons
// ---------------------------------------------------------------------------

let _bqClient: BigQuery | null = null;

function getBqClient(): BigQuery {
  if (_bqClient) return _bqClient;

  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS env var is not set");

  const credentials = JSON.parse(raw);
  _bqClient = new BigQuery({
    projectId: credentials.project_id,
    credentials,
  });
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

/**
 * Sanitize a GSC siteUrl into a valid BigQuery dataset name.
 * e.g. "sc-domain:example.com" -> "gsc_sc_domain_example_com"
 *      "https://www.example.com/" -> "gsc_https_www_example_com"
 */
export function getGscDataset(siteUrl: string): string {
  return `gsc_${siteUrl.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")}`;
}

export async function ensureDataset(datasetId: string): Promise<void> {
  const bq = getBqClient();
  const dataset = bq.dataset(datasetId);
  const [exists] = await dataset.exists();
  if (!exists) {
    // Match the location of existing datasets (dbt_meaning) for cross-dataset JOINs
    let location = "EU";
    try {
      const [meta] = await bq.dataset("dbt_meaning").getMetadata();
      location = meta.location || "EU";
    } catch {
      // Default to EU if we can't check
    }
    await bq.createDataset(datasetId, { location });
    console.log(`[gsc-transfer] Created dataset: ${datasetId} in ${location}`);
  }
}

// ---------------------------------------------------------------------------
// Table schemas
// ---------------------------------------------------------------------------

const TABLE_SCHEMAS: Record<string, { fields: { name: string; type: string }[]; partition?: string }> = {
  search_performance: {
    partition: "query_date",
    fields: [
      { name: "query_date", type: "DATE" },
      { name: "query", type: "STRING" },
      { name: "page", type: "STRING" },
      { name: "country", type: "STRING" },
      { name: "device", type: "STRING" },
      { name: "clicks", type: "INT64" },
      { name: "impressions", type: "INT64" },
      { name: "ctr", type: "FLOAT64" },
      { name: "position", type: "FLOAT64" },
    ],
  },
  url_inspection: {
    partition: "inspected_date",
    fields: [
      { name: "inspected_date", type: "DATE" },
      { name: "url", type: "STRING" },
      { name: "index_verdict", type: "STRING" },
      { name: "coverage_state", type: "STRING" },
      { name: "robotstxt_state", type: "STRING" },
      { name: "indexing_state", type: "STRING" },
      { name: "page_fetch_state", type: "STRING" },
      { name: "last_crawl_time", type: "TIMESTAMP" },
      { name: "crawled_as", type: "STRING" },
      { name: "google_canonical", type: "STRING" },
      { name: "user_canonical", type: "STRING" },
      { name: "mobile_verdict", type: "STRING" },
      { name: "rich_results_verdict", type: "STRING" },
    ],
  },
  site_info: {
    fields: [
      { name: "site_url", type: "STRING" },
      { name: "permission_level", type: "STRING" },
      { name: "last_synced_at", type: "TIMESTAMP" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Table management
// ---------------------------------------------------------------------------

/**
 * Create the GSC tables if they don't exist, with proper schemas and partitioning.
 */
export async function ensureGscTables(datasetId: string): Promise<void> {
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
    console.log(`[gsc-transfer] Created table: ${datasetId}.${tableName}`);
  }
}

// ---------------------------------------------------------------------------
// GSC API client
// ---------------------------------------------------------------------------

interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscApiResponse {
  rows?: GscRow[];
  responseAggregationType?: string;
}

/**
 * Fetch search analytics data from the GSC API with pagination.
 */
async function fetchGscData(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<GscRow[]> {
  const allRows: GscRow[] = [];
  let startRow = 0;
  const rowLimit = 25000;

  while (true) {
    const body = {
      startDate,
      endDate,
      dimensions: ["date", "query", "page", "country", "device"],
      rowLimit,
      startRow,
    };

    const encodedSiteUrl = encodeURIComponent(siteUrl);
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`GSC API error ${res.status}: ${errorBody}`);
    }

    const data = (await res.json()) as GscApiResponse;
    const rows = data.rows || [];
    allRows.push(...rows);

    // If we got fewer rows than the limit, we've reached the end
    if (rows.length < rowLimit) break;
    startRow += rowLimit;
  }

  return allRows;
}

// ---------------------------------------------------------------------------
// Row flattener
// ---------------------------------------------------------------------------

function flattenGscRow(row: GscRow): Record<string, unknown> {
  // keys order matches dimensions: ["date", "query", "page", "country", "device"]
  return {
    query_date: row.keys[0] ?? null,
    query: row.keys[1] ?? null,
    page: row.keys[2] ?? null,
    country: row.keys[3] ?? null,
    device: row.keys[4] ?? null,
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Sync orchestrator
// ---------------------------------------------------------------------------

export interface GscSyncResult {
  searchRows: number;
  inspectedUrls?: number;
}

// ---------------------------------------------------------------------------
// URL Inspection API
// ---------------------------------------------------------------------------

interface InspectionResult {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
      pageFetchState?: string;
      lastCrawlTime?: string;
      crawledAs?: string;
      googleCanonical?: string;
      userCanonical?: string;
    };
    mobileUsabilityResult?: {
      verdict?: string;
    };
    richResultsResult?: {
      verdict?: string;
    };
  };
}

async function inspectUrl(
  accessToken: string,
  siteUrl: string,
  inspectionUrl: string,
): Promise<InspectionResult> {
  const res = await fetch(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inspectionUrl, siteUrl }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`URL Inspection API ${res.status}: ${body.slice(0, 300)}`);
  }

  return res.json() as Promise<InspectionResult>;
}

function flattenInspectionResult(
  url: string,
  result: InspectionResult,
): Record<string, unknown> {
  const idx = result.inspectionResult?.indexStatusResult;
  const mobile = result.inspectionResult?.mobileUsabilityResult;
  const rich = result.inspectionResult?.richResultsResult;

  return {
    inspected_date: new Date().toISOString().split("T")[0],
    url,
    index_verdict: idx?.verdict ?? null,
    coverage_state: idx?.coverageState ?? null,
    robotstxt_state: idx?.robotsTxtState ?? null,
    indexing_state: idx?.indexingState ?? null,
    page_fetch_state: idx?.pageFetchState ?? null,
    last_crawl_time: idx?.lastCrawlTime ?? null,
    crawled_as: idx?.crawledAs ?? null,
    google_canonical: idx?.googleCanonical ?? null,
    user_canonical: idx?.userCanonical ?? null,
    mobile_verdict: mobile?.verdict ?? null,
    rich_results_verdict: rich?.verdict ?? null,
  };
}

/**
 * Inspect a batch of URLs using the URL Inspection API.
 * Caps at maxUrls to stay within the 2,000/day rate limit.
 * Runs requests with limited concurrency to avoid overwhelming the API.
 */
export async function syncUrlInspection(
  userId: string,
  siteUrl: string,
  maxUrls = 500,
): Promise<number> {
  const accessToken = await getValidGoogleTokenForUser(userId, true);
  if (!accessToken) throw new Error(`No Google token for user ${userId}`);

  const datasetId = getGscDataset(siteUrl);
  const bq = getBqClient();
  const projectId = getProjectId();

  // Ensure url_inspection table exists
  await ensureGscTables(datasetId);

  // Get top URLs by impressions from search_performance (most important pages first)
  const fqDataset = `\`${projectId}.${datasetId}\``;
  let urls: string[] = [];
  try {
    const [rows] = await bq.query({
      query: `SELECT page, SUM(impressions) as total_impressions
              FROM ${fqDataset}.search_performance
              WHERE query_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
              GROUP BY page
              ORDER BY total_impressions DESC
              LIMIT ${maxUrls}`,
    });
    urls = rows.map((r: Record<string, unknown>) => String(r.page));
  } catch {
    console.log("[url-inspection] No search_performance data yet, skipping");
    return 0;
  }

  if (urls.length === 0) {
    console.log("[url-inspection] No URLs to inspect");
    return 0;
  }

  console.log(`[url-inspection] Inspecting ${urls.length} URLs for ${siteUrl}`);

  // Inspect URLs with limited concurrency (5 at a time)
  const CONCURRENCY = 5;
  const results: Record<string, unknown>[] = [];

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((url) => inspectUrl(accessToken, siteUrl, url)),
    );

    for (let j = 0; j < batchResults.length; j++) {
      const r = batchResults[j];
      if (r.status === "fulfilled") {
        results.push(flattenInspectionResult(batch[j], r.value));
      } else {
        console.error(`[url-inspection] Failed for ${batch[j]}: ${r.reason}`);
      }
    }
  }

  if (results.length === 0) return 0;

  // Delete today's existing inspection data (idempotent re-run)
  const today = new Date().toISOString().split("T")[0];
  await bq.query({
    query: `DELETE FROM ${fqDataset}.url_inspection WHERE inspected_date = '${today}'`,
  }).catch(() => {});

  // Insert results
  const BATCH = 500;
  for (let i = 0; i < results.length; i += BATCH) {
    await bq.dataset(datasetId).table("url_inspection").insert(results.slice(i, i + BATCH));
  }

  console.log(`[url-inspection] Inserted ${results.length} inspection results`);
  return results.length;
}

/**
 * Sync GSC data into BigQuery for a date range.
 * Fetches from the GSC API, deletes existing rows for the range (idempotent), then inserts.
 */
export async function syncGscData(
  userId: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<GscSyncResult> {
  const accessToken = await getValidGoogleTokenForUser(userId, true);
  if (!accessToken) throw new Error(`No Google token for user ${userId}`);

  const datasetId = getGscDataset(siteUrl);
  const bq = getBqClient();
  const projectId = getProjectId();

  console.log(`[gsc-sync] Starting sync for ${siteUrl}, ${startDate} → ${endDate}`);

  // Fetch data from GSC API
  const gscRows = await fetchGscData(accessToken, siteUrl, startDate, endDate);
  const searchRows = gscRows.map(flattenGscRow);

  console.log(`[gsc-sync] Fetched: ${searchRows.length} search performance rows`);

  const fqDataset = `\`${projectId}.${datasetId}\``;

  // Delete existing rows for the date range (idempotent re-sync)
  if (searchRows.length > 0) {
    await bq.query({
      query: `DELETE FROM ${fqDataset}.search_performance WHERE query_date >= '${startDate}' AND query_date <= '${endDate}'`,
    });
  }

  // Streaming insert into BigQuery (batch to stay under 10k row limit)
  const dataset = bq.dataset(datasetId);
  const BATCH_SIZE = 5000;

  if (searchRows.length > 0) {
    for (let i = 0; i < searchRows.length; i += BATCH_SIZE) {
      await dataset.table("search_performance").insert(searchRows.slice(i, i + BATCH_SIZE));
    }
  }

  // Update site_info
  await bq.query({ query: `DELETE FROM ${fqDataset}.site_info WHERE TRUE` }).catch(() => {});
  await dataset.table("site_info").insert([{
    site_url: siteUrl,
    permission_level: "synced",
    last_synced_at: new Date().toISOString(),
  }]);

  console.log(`[gsc-sync] Sync complete for ${siteUrl}`);
  return { searchRows: searchRows.length };
}
