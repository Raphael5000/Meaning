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

  // Streaming insert into BigQuery
  const dataset = bq.dataset(datasetId);

  if (searchRows.length > 0) {
    await dataset.table("search_performance").insert(searchRows);
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
