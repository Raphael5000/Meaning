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

/** Shared tables in dbt_meaning that do NOT have property_id (no filter needed). */
const DBT_SHARED_TABLES = new Set([
  "exchange_rates",
]);

/** Google Ads tables — these live in ads_{customerId} dataset. */
const ADS_TABLES = new Set([
  "campaign_performance",
  "keyword_performance",
  "click_attribution",
  "account_info",
]);

/** LinkedIn tables — these live in linkedin_{orgId} dataset. */
const LINKEDIN_TABLES = new Set([
  "post_performance",
  "follower_stats",
  "follower_demographics",
  "page_stats",
  "org_info",
]);

/** Mailchimp tables — these live in mailchimp_{listId} dataset. */
const MAILCHIMP_TABLES = new Set([
  "campaign_reports",
  "audience_stats",
  "audience_growth",
  "mc_account_info",
]);

/** GSC tables — these live in gsc_{sanitizedSiteUrl} dataset. */
const GSC_TABLES = new Set([
  "search_performance",
  "site_info",
  "url_inspection",
]);

/** Microsoft Ads tables — prefixed with msads_ to avoid collision with Google Ads tables.
 *  These live in msads_{accountId} dataset. The msads_ prefix is stripped when routing. */
const MSADS_TABLES = new Map([
  ["msads_campaign_performance", "campaign_performance"],
  ["msads_keyword_performance", "keyword_performance"],
  ["msads_search_query_performance", "search_query_performance"],
  ["msads_account_info", "account_info"],
]);

/**
 * Run a query that is automatically scoped to a specific GA4 property's
 * BigQuery dataset. The `{dataset}` placeholder in the SQL is replaced
 * with the appropriate dataset:
 *   - dbt mart tables -> `dbt_meaning`
 *   - raw event tables -> `analytics_{propertyId}`
 *   - ads tables -> `ads_{adsCustomerId}` (no suffix on table name)
 *   - linkedin tables -> `linkedin_{orgId}`
 *   - mailchimp tables -> `mailchimp_{listId}`
 *   - gsc tables -> `gsc_{sanitizedSiteUrl}`
 *
 * @param adsCustomerId - Optional Google Ads customer ID for routing Ads queries
 * @param linkedInOrgId - Optional LinkedIn organization ID for routing LinkedIn queries
 * @param mailchimpListId - Optional Mailchimp list ID for routing Mailchimp queries
 * @param gscSiteUrl - Optional GSC site URL for routing Search Console queries
 */
export async function runPropertyQuery(
  propertyId: string,
  sql: string,
  params?: Record<string, unknown>,
  adsCustomerId?: string | null,
  linkedInOrgId?: string | null,
  mailchimpListId?: string | null,
  gscSiteUrl?: string | null,
  msAdsAccountId?: string | null
): Promise<QueryResult> {
  const rawDataset = `analytics_${propertyId}`;
  const adsDataset = adsCustomerId ? `ads_${adsCustomerId}` : null;
  const linkedInDataset = linkedInOrgId ? `linkedin_${linkedInOrgId}` : null;
  const mailchimpDataset = mailchimpListId ? `mailchimp_${mailchimpListId.replace(/[^a-zA-Z0-9]/g, "")}` : null;
  const gscDataset = gscSiteUrl ? `gsc_${gscSiteUrl.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")}` : null;
  const msAdsDataset = msAdsAccountId ? `msads_${msAdsAccountId.replace(/-/g, "")}` : null;

  // Replace {dataset}.tableName with the correct dataset based on table type
  let usesDbtTable = false;
  const scopedSql = sql.replace(
    /\{dataset\}\.(\w+)/g,
    (_match, tableName: string) => {
      if (ADS_TABLES.has(tableName) && adsDataset) {
        return `${adsDataset}.${tableName}`;
      }
      if (MSADS_TABLES.has(tableName) && msAdsDataset) {
        return `${msAdsDataset}.${MSADS_TABLES.get(tableName)}`;
      }
      if (LINKEDIN_TABLES.has(tableName) && linkedInDataset) {
        return `${linkedInDataset}.${tableName}`;
      }
      if (MAILCHIMP_TABLES.has(tableName) && mailchimpDataset) {
        return `${mailchimpDataset}.${tableName}`;
      }
      if (GSC_TABLES.has(tableName) && gscDataset) {
        return `${gscDataset}.${tableName}`;
      }
      if (DBT_SHARED_TABLES.has(tableName)) {
        // Shared reference tables — no property_id filter
        return `${DBT_DATASET}.${tableName}`;
      }
      if (DBT_TABLES.has(tableName)) {
        usesDbtTable = true;
        return `${DBT_DATASET}.${tableName}`;
      }
      return `${rawDataset}.${tableName}`;
    }
  );

  // Inject property_id filter for dbt tables (shared dataset contains all properties)
  let filteredSql = scopedSql;
  const filteredParams = params ? { ...params } : {};
  if (usesDbtTable && propertyId) {
    filteredParams._propertyId = propertyId;
    // If query has WHERE, append AND; otherwise inject WHERE before GROUP BY/ORDER BY/LIMIT
    if (/\bWHERE\b/i.test(filteredSql)) {
      // Insert property_id condition after the first WHERE
      filteredSql = filteredSql.replace(
        /\bWHERE\b/i,
        "WHERE property_id = @_propertyId AND"
      );
    } else {
      // No WHERE clause — inject before GROUP BY, ORDER BY, LIMIT, or at end
      const insertPoint = filteredSql.search(/\b(GROUP\s+BY|ORDER\s+BY|LIMIT)\b/i);
      if (insertPoint > 0) {
        filteredSql =
          filteredSql.slice(0, insertPoint) +
          "WHERE property_id = @_propertyId " +
          filteredSql.slice(insertPoint);
      } else {
        // Append at end (before any trailing semicolon)
        filteredSql = filteredSql.replace(/;?\s*$/, " WHERE property_id = @_propertyId");
      }
    }
  }

  return runQuery(filteredSql, Object.keys(filteredParams).length > 0 ? filteredParams : undefined);
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[BigQuery] Raw dataset ${rawDataset} not accessible: ${msg.slice(0, 200)}`);
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
