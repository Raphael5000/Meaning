import { BigQuery } from "@google-cloud/bigquery";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _client: BigQuery | null = null;

function getClient(): BigQuery {
  if (_client) return _client;

  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) {
    throw new Error("GOOGLE_BIGQUERY_CREDENTIALS env var is not set");
  }

  const credentials = JSON.parse(raw);
  _client = new BigQuery({
    projectId: credentials.project_id,
    credentials,
  });

  return _client;
}

// ---------------------------------------------------------------------------
// Core query runner
// ---------------------------------------------------------------------------

export interface QueryResult {
  rows: Record<string, unknown>[];
  totalRows: number;
  bytesProcessed: number;
}

const MAX_BYTES_BILLED = 1_000_000_000; // 1 GB per query
const MAX_ROWS = 500;

export async function runQuery(
  sql: string,
  params?: Record<string, unknown>
): Promise<QueryResult> {
  const client = getClient();

  // Enforce a LIMIT if the query doesn't already have one
  const hasLimit = /\bLIMIT\s+\d+/i.test(sql);
  const safeSql = hasLimit ? sql : `${sql.replace(/;\s*$/, "")} LIMIT ${MAX_ROWS}`;

  const [job] = await client.createQueryJob({
    query: safeSql,
    params,
    maximumBytesBilled: String(MAX_BYTES_BILLED),
  });

  const [rows] = await job.getQueryResults();
  const metadata = await job.getMetadata();
  const stats = metadata[0]?.statistics?.query;
  const bytesProcessed = Number(stats?.totalBytesBilled || 0);

  console.log(
    `[BigQuery] ${bytesProcessed} bytes billed | ${rows.length} rows returned`
  );

  return {
    rows,
    totalRows: rows.length,
    bytesProcessed,
  };
}

// ---------------------------------------------------------------------------
// Property-scoped query helper
// ---------------------------------------------------------------------------

/**
 * The dbt dataset where mart models (sessions, pageviews, users, etc.) live.
 * Raw event data remains in the per-property `analytics_{propertyId}` dataset.
 */
const DBT_DATASET = "dbt_meaning";

/** Tables that live in the dbt dataset rather than the raw GA4 export. */
const DBT_TABLES = new Set([
  "sessions",
  "pageviews",
  "users",
  "conversions",
  "traffic_sources",
  "stg_events",
]);

/** Google Ads DTS tables — these live in ads_{customerId} dataset.
 *  The actual table names in BigQuery have a _{customerId} suffix. */
const ADS_TABLES = new Set([
  "ads_CampaignBasicStats",
  "ads_Campaign",
  "ads_AdGroup",
  "ads_AdGroupBasicStats",
  "ads_Keyword",
  "ads_KeywordBasicStats",
  "ads_ClickStats",
  "ads_SearchQueryStats",
  "ads_GeoStats",
  "ads_AccountBasicStats",
]);

/**
 * Run a query that is automatically scoped to a specific GA4 property's
 * BigQuery dataset. The `{dataset}` placeholder in the SQL is replaced
 * with the appropriate dataset:
 *   - dbt mart tables -> `dbt_meaning`
 *   - raw event tables -> `analytics_{propertyId}`
 *   - ads tables -> `ads_{adsCustomerId}` (with _{customerId} suffix on table name)
 *
 * @param adsCustomerId - Optional Google Ads customer ID for routing Ads queries
 */
export async function runPropertyQuery(
  propertyId: string,
  sql: string,
  params?: Record<string, unknown>,
  adsCustomerId?: string | null
): Promise<QueryResult> {
  const rawDataset = `analytics_${propertyId}`;
  const adsDataset = adsCustomerId ? `ads_${adsCustomerId}` : null;

  // Replace {dataset}.tableName with the correct dataset based on table type
  const scopedSql = sql.replace(
    /\{dataset\}\.(\w+)/g,
    (_match, tableName: string) => {
      // Check if it's an Ads DTS table
      if (ADS_TABLES.has(tableName) && adsDataset) {
        // DTS tables have _{customerId} suffix: ads_Campaign_6839681443
        return `${adsDataset}.${tableName}_${adsCustomerId}`;
      }
      const dataset = DBT_TABLES.has(tableName) ? DBT_DATASET : rawDataset;
      return `${dataset}.${tableName}`;
    }
  );

  return runQuery(scopedSql, params);
}

// ---------------------------------------------------------------------------
// Schema / available fields
// ---------------------------------------------------------------------------

export interface DatasetField {
  tableName: string;
  columnName: string;
  dataType: string;
}

export async function getPropertySchema(
  propertyId: string
): Promise<DatasetField[]> {
  const client = getClient();
  const fields: DatasetField[] = [];

  // Include dbt mart tables (primary query targets)
  const [dbtTables] = await client.dataset(DBT_DATASET).getTables();
  for (const table of dbtTables) {
    const [metadata] = await table.getMetadata();
    const schema = metadata.schema?.fields || [];
    for (const field of schema) {
      fields.push({
        tableName: table.id || "",
        columnName: field.name || "",
        dataType: field.type || "",
      });
    }
  }

  // Include raw GA4 export tables
  const rawDataset = `analytics_${propertyId}`;
  try {
    const [rawTables] = await client.dataset(rawDataset).getTables();
    for (const table of rawTables) {
      const [metadata] = await table.getMetadata();
      const schema = metadata.schema?.fields || [];
      for (const field of schema) {
        fields.push({
          tableName: table.id || "",
          columnName: field.name || "",
          dataType: field.type || "",
        });
      }
    }
  } catch {
    // Raw dataset may not exist yet for new properties
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Realtime data (intraday table)
// ---------------------------------------------------------------------------

export async function queryRealtimeData(
  propertyId: string
): Promise<QueryResult> {
  const dataset = `analytics_${propertyId}`;

  const sql = `
    SELECT
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') AS page_location,
      device.category AS device_category,
      geo.country AS country,
      COUNT(DISTINCT user_pseudo_id) AS active_users,
      COUNT(*) AS event_count
    FROM \`${dataset}.events_intraday_*\`
    WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
      AND TIMESTAMP_MICROS(event_timestamp) >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 MINUTE)
    GROUP BY page_location, device_category, country
    ORDER BY active_users DESC
    LIMIT 50
  `;

  return runQuery(sql);
}
