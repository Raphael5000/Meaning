import { BigQuery } from "@google-cloud/bigquery";
import { getValidGoogleTokenForUser } from "@/lib/google-token";
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

export function getAdsDataset(customerId: string): string {
  return `ads_${customerId.replace(/-/g, "")}`;
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
    console.log(`[ads-transfer] Created dataset: ${datasetId} in ${location}`);
  }
}

// ---------------------------------------------------------------------------
// Table schemas
// ---------------------------------------------------------------------------

const TABLE_SCHEMAS: Record<string, { fields: { name: string; type: string }[]; partition?: string }> = {
  campaign_performance: {
    partition: "stats_date",
    fields: [
      { name: "stats_date", type: "DATE" },
      { name: "campaign_id", type: "INT64" },
      { name: "campaign_name", type: "STRING" },
      { name: "campaign_status", type: "STRING" },
      { name: "impressions", type: "INT64" },
      { name: "clicks", type: "INT64" },
      { name: "cost_micros", type: "INT64" },
      { name: "cost", type: "FLOAT64" },
      { name: "conversions", type: "FLOAT64" },
      { name: "conversions_value", type: "FLOAT64" },
    ],
  },
  keyword_performance: {
    partition: "stats_date",
    fields: [
      { name: "stats_date", type: "DATE" },
      { name: "campaign_id", type: "INT64" },
      { name: "campaign_name", type: "STRING" },
      { name: "ad_group_id", type: "INT64" },
      { name: "ad_group_name", type: "STRING" },
      { name: "keyword_text", type: "STRING" },
      { name: "match_type", type: "STRING" },
      { name: "impressions", type: "INT64" },
      { name: "clicks", type: "INT64" },
      { name: "cost_micros", type: "INT64" },
      { name: "cost", type: "FLOAT64" },
      { name: "conversions", type: "FLOAT64" },
    ],
  },
  click_attribution: {
    partition: "click_date",
    fields: [
      { name: "click_date", type: "DATE" },
      { name: "gclid", type: "STRING" },
      { name: "campaign_id", type: "INT64" },
      { name: "campaign_name", type: "STRING" },
      { name: "ad_group_id", type: "INT64" },
      { name: "keyword_text", type: "STRING" },
    ],
  },
  account_info: {
    fields: [
      { name: "customer_id", type: "STRING" },
      { name: "currency_code", type: "STRING" },
      { name: "descriptive_name", type: "STRING" },
      { name: "last_synced_at", type: "TIMESTAMP" },
    ],
  },
};

/**
 * Natural key columns for each table (used by MERGE to prevent duplicates).
 */
export const ADS_KEY_COLUMNS: Record<string, string[]> = {
  campaign_performance: ["stats_date", "campaign_id"],
  keyword_performance: ["stats_date", "campaign_id", "ad_group_id", "keyword_text"],
  click_attribution: ["click_date", "gclid"],
  account_info: ["customer_id"],
};

// ---------------------------------------------------------------------------
// Google Ads API client
// ---------------------------------------------------------------------------

interface GoogleAdsRow {
  [key: string]: unknown;
}

/**
 * Call the Google Ads API searchStream endpoint and return flat rows.
 */
async function fetchGoogleAdsData(
  accessToken: string,
  customerId: string,
  gaqlQuery: string,
): Promise<GoogleAdsRow[]> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN env var not set");

  const cleanId = customerId.replace(/-/g, "");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };

  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId.replace(/-/g, "");
  }

  const res = await fetch(
    `https://googleads.googleapis.com/v24/customers/${cleanId}/googleAds:searchStream`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query: gaqlQuery }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Ads API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { results?: GoogleAdsRow[] }[];
  // searchStream returns an array of batches
  const rows: GoogleAdsRow[] = [];
  for (const batch of data) {
    if (batch.results) {
      rows.push(...batch.results);
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Table management
// ---------------------------------------------------------------------------

/**
 * Create the 4 Ads tables if they don't exist, with proper schemas and partitioning.
 */
export async function ensureAdsTables(datasetId: string): Promise<void> {
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
    console.log(`[ads-transfer] Created table: ${datasetId}.${tableName}`);
  }
}

// ---------------------------------------------------------------------------
// GAQL queries
// ---------------------------------------------------------------------------

function campaignQuery(start: string, end: string): string {
  return `SELECT campaign.id, campaign.name, campaign.status, segments.date, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date >= '${start}' AND segments.date <= '${end}'`;
}

function keywordQuery(start: string, end: string): string {
  return `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, segments.date, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions FROM keyword_view WHERE segments.date >= '${start}' AND segments.date <= '${end}'`;
}

function clickQuery(start: string, end: string): string {
  return `SELECT click_view.gclid, campaign.id, campaign.name, ad_group.id, segments.date, click_view.keyword_info.text FROM click_view WHERE segments.date >= '${start}' AND segments.date <= '${end}'`;
}

const ACCOUNT_QUERY = `SELECT customer.id, customer.currency_code, customer.descriptive_name FROM customer LIMIT 1`;

// ---------------------------------------------------------------------------
// Row flatteners
// ---------------------------------------------------------------------------

function flattenCampaignRow(row: GoogleAdsRow): Record<string, unknown> {
  const campaign = row.campaign as Record<string, unknown> | undefined;
  const metrics = row.metrics as Record<string, unknown> | undefined;
  const segments = row.segments as Record<string, unknown> | undefined;
  const costMicros = Number(metrics?.costMicros ?? 0);
  return {
    stats_date: segments?.date ?? null,
    campaign_id: Number(campaign?.id ?? 0),
    campaign_name: campaign?.name ?? null,
    campaign_status: campaign?.status ?? null,
    impressions: Number(metrics?.impressions ?? 0),
    clicks: Number(metrics?.clicks ?? 0),
    cost_micros: costMicros,
    cost: costMicros / 1_000_000,
    conversions: Number(metrics?.conversions ?? 0),
    conversions_value: Number(metrics?.conversionsValue ?? 0),
  };
}

function flattenKeywordRow(row: GoogleAdsRow): Record<string, unknown> {
  const campaign = row.campaign as Record<string, unknown> | undefined;
  const adGroup = row.adGroup as Record<string, unknown> | undefined;
  const criterion = row.adGroupCriterion as Record<string, unknown> | undefined;
  const keyword = criterion?.keyword as Record<string, unknown> | undefined;
  const metrics = row.metrics as Record<string, unknown> | undefined;
  const segments = row.segments as Record<string, unknown> | undefined;
  const costMicros = Number(metrics?.costMicros ?? 0);
  return {
    stats_date: segments?.date ?? null,
    campaign_id: Number(campaign?.id ?? 0),
    campaign_name: campaign?.name ?? null,
    ad_group_id: Number(adGroup?.id ?? 0),
    ad_group_name: adGroup?.name ?? null,
    keyword_text: keyword?.text ?? null,
    match_type: keyword?.matchType ?? null,
    impressions: Number(metrics?.impressions ?? 0),
    clicks: Number(metrics?.clicks ?? 0),
    cost_micros: costMicros,
    cost: costMicros / 1_000_000,
    conversions: Number(metrics?.conversions ?? 0),
  };
}

function flattenClickRow(row: GoogleAdsRow): Record<string, unknown> {
  const clickView = row.clickView as Record<string, unknown> | undefined;
  const campaign = row.campaign as Record<string, unknown> | undefined;
  const adGroup = row.adGroup as Record<string, unknown> | undefined;
  const segments = row.segments as Record<string, unknown> | undefined;
  const keywordInfo = clickView?.keywordInfo as Record<string, unknown> | undefined;
  return {
    click_date: segments?.date ?? null,
    gclid: clickView?.gclid ?? null,
    campaign_id: Number(campaign?.id ?? 0),
    campaign_name: campaign?.name ?? null,
    ad_group_id: Number(adGroup?.id ?? 0),
    keyword_text: keywordInfo?.text ?? null,
  };
}

function flattenAccountRow(row: GoogleAdsRow): Record<string, unknown> {
  const customer = row.customer as Record<string, unknown> | undefined;
  return {
    customer_id: String(customer?.id ?? ""),
    currency_code: customer?.currencyCode ?? null,
    descriptive_name: customer?.descriptiveName ?? null,
    last_synced_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Sync orchestrator
// ---------------------------------------------------------------------------

export interface SyncResult {
  campaignRows: number;
  keywordRows: number;
  clickRows: number;
}

/**
 * Sync Google Ads data into BigQuery for a date range.
 * Fetches from the Ads API, deletes existing rows for the range (idempotent), then inserts.
 */
export async function syncAdsData(
  userId: string,
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<SyncResult> {
  const accessToken = await getValidGoogleTokenForUser(userId, true);
  if (!accessToken) throw new Error(`No Google token for user ${userId}`);

  const cleanId = customerId.replace(/-/g, "");
  const datasetId = getAdsDataset(cleanId);
  const bq = getBqClient();
  const projectId = getProjectId();

  console.log(`[ads-sync] Starting sync for customer ${cleanId}, ${startDate} → ${endDate}`);

  // Fetch all data from Google Ads API in parallel
  const [campaignData, keywordData, clickData, accountData] = await Promise.all([
    fetchGoogleAdsData(accessToken, cleanId, campaignQuery(startDate, endDate)),
    fetchGoogleAdsData(accessToken, cleanId, keywordQuery(startDate, endDate)),
    fetchGoogleAdsData(accessToken, cleanId, clickQuery(startDate, endDate)).catch((err) => {
      // click_view may not be available for all accounts
      console.warn(`[ads-sync] click_view fetch failed (non-fatal):`, err.message);
      return [] as GoogleAdsRow[];
    }),
    fetchGoogleAdsData(accessToken, cleanId, ACCOUNT_QUERY),
  ]);

  // Flatten rows
  const campaignRows = campaignData.map(flattenCampaignRow);
  const keywordRows = keywordData.map(flattenKeywordRow);
  const clickRows = clickData.map(flattenClickRow);
  const accountRows = accountData.map(flattenAccountRow);

  console.log(`[ads-sync] Fetched: ${campaignRows.length} campaign, ${keywordRows.length} keyword, ${clickRows.length} click, ${accountRows.length} account rows`);

  // Delete existing rows for the date range, then insert fresh data.
  // If DELETE is blocked by streaming buffer, skip the insert to avoid duplicates.
  // A daily dedup cron cleans any duplicates that slip through from concurrent syncs.
  const fqDataset = `\`${projectId}.${datasetId}\``;
  const dataset = bq.dataset(datasetId);

  if (campaignRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.campaign_performance WHERE stats_date >= '${startDate}' AND stats_date <= '${endDate}'`, "ads-sync");
    if (ok) await dataset.table("campaign_performance").insert(campaignRows);
  }
  if (keywordRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.keyword_performance WHERE stats_date >= '${startDate}' AND stats_date <= '${endDate}'`, "ads-sync");
    if (ok) await dataset.table("keyword_performance").insert(keywordRows);
  }
  if (clickRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.click_attribution WHERE click_date >= '${startDate}' AND click_date <= '${endDate}'`, "ads-sync");
    if (ok) await dataset.table("click_attribution").insert(clickRows);
  }
  if (accountRows.length > 0) {
    await safeDelete(bq, `DELETE FROM ${fqDataset}.account_info WHERE TRUE`, "ads-sync");
    await dataset.table("account_info").insert(accountRows);
  }

  console.log(`[ads-sync] Sync complete for customer ${cleanId}`);
  return {
    campaignRows: campaignRows.length,
    keywordRows: keywordRows.length,
    clickRows: clickRows.length,
  };
}

// ---------------------------------------------------------------------------
// Transfer status
// ---------------------------------------------------------------------------

export interface AdsDataStatus {
  datasetId: string;
  hasData: boolean;
  tables: string[];
}

export async function checkAdsDataStatus(
  customerId: string,
): Promise<AdsDataStatus> {
  const bq = getBqClient();
  const datasetId = getAdsDataset(customerId);

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
