import { BigQuery } from "@google-cloud/bigquery";
import { getValidMicrosoftAdsTokenForUser } from "@/lib/microsoft-ads-token";
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

export function getMsAdsDataset(accountId: string): string {
  return `msads_${accountId.replace(/-/g, "")}`;
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
      // Default to EU
    }
    await bq.createDataset(datasetId, { location });
    console.log(`[msads-transfer] Created dataset: ${datasetId} in ${location}`);
  }
}

// ---------------------------------------------------------------------------
// Table schemas — aligned with Google Ads column names where possible
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
      { name: "cost", type: "FLOAT64" },
      { name: "conversions", type: "FLOAT64" },
      { name: "conversions_value", type: "FLOAT64" },
      { name: "revenue", type: "FLOAT64" },
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
      { name: "cost", type: "FLOAT64" },
      { name: "conversions", type: "FLOAT64" },
    ],
  },
  search_query_performance: {
    partition: "stats_date",
    fields: [
      { name: "stats_date", type: "DATE" },
      { name: "search_query", type: "STRING" },
      { name: "campaign_id", type: "INT64" },
      { name: "campaign_name", type: "STRING" },
      { name: "ad_group_id", type: "INT64" },
      { name: "ad_group_name", type: "STRING" },
      { name: "impressions", type: "INT64" },
      { name: "clicks", type: "INT64" },
      { name: "cost", type: "FLOAT64" },
      { name: "conversions", type: "FLOAT64" },
    ],
  },
  account_info: {
    fields: [
      { name: "account_id", type: "STRING" },
      { name: "account_name", type: "STRING" },
      { name: "currency_code", type: "STRING" },
      { name: "last_synced_at", type: "TIMESTAMP" },
    ],
  },
};

export const MSADS_KEY_COLUMNS: Record<string, string[]> = {
  campaign_performance: ["stats_date", "campaign_id"],
  keyword_performance: ["stats_date", "campaign_id", "ad_group_id", "keyword_text"],
  search_query_performance: ["stats_date", "campaign_id", "ad_group_id", "search_query"],
  account_info: ["account_id"],
};

// ---------------------------------------------------------------------------
// Table management
// ---------------------------------------------------------------------------

/**
 * Drop and recreate all Microsoft Ads tables in a dataset (for resync).
 * Uses drop+create instead of DELETE to avoid streaming buffer conflicts.
 */
export async function resetMsAdsTables(datasetId: string): Promise<void> {
  const bq = getBqClient();
  const dataset = bq.dataset(datasetId);

  for (const tableName of Object.keys(TABLE_SCHEMAS)) {
    const table = dataset.table(tableName);
    const [exists] = await table.exists();
    if (exists) {
      await table.delete();
    }
  }
  console.log(`[msads-transfer] Dropped all tables in ${datasetId}`);
  await ensureMsAdsTables(datasetId);
}

export async function ensureMsAdsTables(datasetId: string): Promise<void> {
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
    console.log(`[msads-transfer] Created table: ${datasetId}.${tableName}`);
  }
}

// ---------------------------------------------------------------------------
// Microsoft Ads Reporting API v13 — REST/JSON submit/poll/download
// ---------------------------------------------------------------------------

const REPORTING_BASE = "https://reporting.api.bingads.microsoft.com/Reporting/v13";

interface ReportColumn {
  name: string;
}

function buildReportRequestJson(
  reportType: string,
  columns: ReportColumn[],
  accountId: string,
  startDate: string,
  endDate: string,
): Record<string, unknown> {
  const [sy, sm, sd] = startDate.split("-");
  const [ey, em, ed] = endDate.split("-");

  return {
    ReportRequest: {
      ExcludeColumnHeaders: false,
      ExcludeReportFooter: true,
      ExcludeReportHeader: true,
      Format: "Csv",
      ReturnOnlyCompleteData: false,
      Type: reportType + "Request",
      Aggregation: "Daily",
      Columns: columns.map((c) => c.name),
      Scope: {
        AccountIds: [parseInt(accountId)],
      },
      Time: {
        CustomDateRangeStart: {
          Day: parseInt(sd),
          Month: parseInt(sm),
          Year: parseInt(sy),
        },
        CustomDateRangeEnd: {
          Day: parseInt(ed),
          Month: parseInt(em),
          Year: parseInt(ey),
        },
      },
    },
  };
}

function getReportHeaders(accessToken: string, developerToken: string, accountId: string, customerId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    DeveloperToken: developerToken,
    CustomerAccountId: accountId,
    CustomerId: customerId,
  };
}

/**
 * Submit a report, poll until complete, download CSV, parse into rows.
 */
async function fetchReport(
  accessToken: string,
  developerToken: string,
  accountId: string,
  customerId: string,
  reportType: string,
  columns: ReportColumn[],
  startDate: string,
  endDate: string,
): Promise<Record<string, string>[]> {
  const headers = getReportHeaders(accessToken, developerToken, accountId, customerId);
  const requestBody = buildReportRequestJson(reportType, columns, accountId, startDate, endDate);

  // Step 1: Submit
  const submitRes = await fetch(`${REPORTING_BASE}/GenerateReport/Submit`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  const submitData = await submitRes.json().catch(() => null);
  if (!submitRes.ok || !submitData) {
    throw new Error(`[msads] Report submit failed (${reportType}): ${submitRes.status} — ${JSON.stringify(submitData).slice(0, 300)}`);
  }

  const reportRequestId = submitData.ReportRequestId;
  if (!reportRequestId) {
    throw new Error(`[msads] No ReportRequestId in response: ${JSON.stringify(submitData).slice(0, 300)}`);
  }

  console.log(`[msads] Report ${reportType} submitted, requestId: ${reportRequestId}`);

  // Step 2: Poll with exponential backoff
  let pollDelay = 2000;
  const maxPollTime = 10 * 60 * 1000; // 10 minutes
  const pollStart = Date.now();

  while (Date.now() - pollStart < maxPollTime) {
    await new Promise((r) => setTimeout(r, pollDelay));
    pollDelay = Math.min(pollDelay * 1.5, 30000);

    const pollRes = await fetch(`${REPORTING_BASE}/GenerateReport/Poll`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ReportRequestId: reportRequestId }),
    });

    const pollData = await pollRes.json().catch(() => null);
    const status = pollData?.ReportRequestStatus?.Status;

    if (status === "Success") {
      const downloadUrl = pollData?.ReportRequestStatus?.ReportDownloadUrl;
      if (!downloadUrl) {
        console.log(`[msads] Report ${reportType} completed with no data`);
        return [];
      }

      // Step 3: Download and parse CSV
      const csvRes = await fetch(downloadUrl);
      if (!csvRes.ok) {
        throw new Error(`[msads] Failed to download report: ${csvRes.status}`);
      }

      // The report may be a zip file containing a CSV
      const contentType = csvRes.headers.get("content-type") || "";
      let csvText: string;

      if (contentType.includes("zip") || downloadUrl.includes(".zip")) {
        // Download as buffer and decompress
        const zipBuffer = Buffer.from(await csvRes.arrayBuffer());
        const { unzipSync } = await import("zlib");
        // Microsoft uses zip format — try to extract with basic approach
        // The zip contains a single CSV file
        try {
          // Try raw deflate (skip zip headers — find the CSV content)
          const csvStart = zipBuffer.indexOf("\"") !== -1 ? zipBuffer.indexOf("\"") : 0;
          csvText = zipBuffer.toString("utf-8", csvStart);
          // If it looks like garbled binary, the zip needs proper decompression
          if (csvText.includes("\0")) {
            // Use AdmZip or manual zip extraction
            const { inflateRawSync } = await import("zlib");
            // Find local file header (PK\x03\x04) and extract
            const localHeaderIdx = zipBuffer.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
            if (localHeaderIdx >= 0) {
              const compressedDataStart = localHeaderIdx + 30 + zipBuffer.readUInt16LE(localHeaderIdx + 26) + zipBuffer.readUInt16LE(localHeaderIdx + 28);
              const compressedSize = zipBuffer.readUInt32LE(localHeaderIdx + 18);
              const compressedData = zipBuffer.subarray(compressedDataStart, compressedDataStart + compressedSize);
              const compressionMethod = zipBuffer.readUInt16LE(localHeaderIdx + 8);
              if (compressionMethod === 8) {
                csvText = inflateRawSync(compressedData).toString("utf-8");
              } else {
                // Stored (no compression)
                csvText = compressedData.toString("utf-8");
              }
            } else {
              // Fallback: try gunzip
              csvText = unzipSync(zipBuffer).toString("utf-8");
            }
          }
        } catch {
          // Last resort: try gunzip
          try {
            csvText = unzipSync(zipBuffer).toString("utf-8");
          } catch {
            throw new Error(`[msads] Failed to decompress report ZIP for ${reportType}`);
          }
        }
      } else {
        csvText = await csvRes.text();
      }

      return parseCsv(csvText);
    }

    if (status === "Error") {
      throw new Error(`[msads] Report ${reportType} failed: ${JSON.stringify(pollData).slice(0, 300)}`);
    }

    // Status is "Pending" — continue polling
    console.log(`[msads] Report ${reportType} still pending...`);
  }

  throw new Error(`[msads] Report ${reportType} timed out after ${maxPollTime / 1000}s`);
}

/**
 * Parse a CSV string into rows of key-value pairs.
 */
/**
 * Parse a CSV line respecting quoted fields (handles commas inside quotes).
 * Microsoft Ads formats numbers like "6,423.00" which breaks naive split(",").
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Handle BOM
  let headerLine = lines[0];
  if (headerLine.charCodeAt(0) === 0xfeff) {
    headerLine = headerLine.slice(1);
  }

  const headers = splitCsvLine(headerLine);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Report definitions
// ---------------------------------------------------------------------------

const CAMPAIGN_COLUMNS: ReportColumn[] = [
  { name: "TimePeriod" },
  { name: "CampaignId" },
  { name: "CampaignName" },
  { name: "CampaignStatus" },
  { name: "Impressions" },
  { name: "Clicks" },
  { name: "Spend" },
  { name: "Conversions" },
  { name: "Revenue" },
  { name: "CurrencyCode" },
];

const KEYWORD_COLUMNS: ReportColumn[] = [
  { name: "TimePeriod" },
  { name: "CampaignId" },
  { name: "CampaignName" },
  { name: "AdGroupId" },
  { name: "AdGroupName" },
  { name: "Keyword" },
  { name: "DeliveredMatchType" },
  { name: "Impressions" },
  { name: "Clicks" },
  { name: "Spend" },
  { name: "Conversions" },
];

const SEARCH_QUERY_COLUMNS: ReportColumn[] = [
  { name: "TimePeriod" },
  { name: "SearchQuery" },
  { name: "CampaignId" },
  { name: "CampaignName" },
  { name: "AdGroupId" },
  { name: "AdGroupName" },
  { name: "Impressions" },
  { name: "Clicks" },
  { name: "Spend" },
  { name: "Conversions" },
];

// ---------------------------------------------------------------------------
// Row mappers — normalize Microsoft column names to our BQ schema
// ---------------------------------------------------------------------------

/** Strip commas from number strings before parsing (Microsoft formats: "6,423.00") */
function num(val: string | undefined): number {
  return parseFloat((val ?? "0").replace(/,/g, "")) || 0;
}

function int(val: string | undefined): number {
  return parseInt((val ?? "0").replace(/,/g, "")) || 0;
}

function mapCampaignRow(row: Record<string, string>): Record<string, unknown> {
  return {
    stats_date: row["TimePeriod"] ?? null,
    campaign_id: int(row["CampaignId"]),
    campaign_name: row["CampaignName"] ?? null,
    campaign_status: row["CampaignStatus"] ?? null,
    impressions: int(row["Impressions"]),
    clicks: int(row["Clicks"]),
    cost: num(row["Spend"]),
    conversions: num(row["Conversions"]),
    conversions_value: num(row["Revenue"]),
    revenue: num(row["Revenue"]),
  };
}

function mapKeywordRow(row: Record<string, string>): Record<string, unknown> {
  return {
    stats_date: row["TimePeriod"] ?? null,
    campaign_id: int(row["CampaignId"]),
    campaign_name: row["CampaignName"] ?? null,
    ad_group_id: int(row["AdGroupId"]),
    ad_group_name: row["AdGroupName"] ?? null,
    keyword_text: row["Keyword"] ?? null,
    match_type: row["DeliveredMatchType"] ?? null,
    impressions: int(row["Impressions"]),
    clicks: int(row["Clicks"]),
    cost: num(row["Spend"]),
    conversions: num(row["Conversions"]),
  };
}

function mapSearchQueryRow(row: Record<string, string>): Record<string, unknown> {
  return {
    stats_date: row["TimePeriod"] ?? null,
    search_query: row["SearchQuery"] ?? null,
    campaign_id: int(row["CampaignId"]),
    campaign_name: row["CampaignName"] ?? null,
    ad_group_id: int(row["AdGroupId"]),
    ad_group_name: row["AdGroupName"] ?? null,
    impressions: int(row["Impressions"]),
    clicks: int(row["Clicks"]),
    cost: num(row["Spend"]),
    conversions: num(row["Conversions"]),
  };
}

// ---------------------------------------------------------------------------
// Sync orchestrator
// ---------------------------------------------------------------------------

export interface MsAdsSyncResult {
  campaignRows: number;
  keywordRows: number;
  searchQueryRows: number;
}

/**
 * Sync Microsoft Ads data into BigQuery for a date range.
 * Submits async reports, polls for completion, downloads CSV, parses, and inserts.
 */
export async function syncMicrosoftAdsData(
  userId: string,
  accountId: string,
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<MsAdsSyncResult> {
  const accessToken = await getValidMicrosoftAdsTokenForUser(userId, true);
  if (!accessToken) throw new Error(`No Microsoft Ads token for user ${userId}`);

  const developerToken = process.env.MICROSOFT_ADS_DEVELOPER_TOKEN;
  if (!developerToken) throw new Error("MICROSOFT_ADS_DEVELOPER_TOKEN env var not set");

  const datasetId = getMsAdsDataset(accountId);
  const bq = getBqClient();
  const projectId = getProjectId();

  console.log(`[msads-sync] Starting sync for account ${accountId}, ${startDate} → ${endDate}`);

  // Fetch all reports in parallel
  const [campaignData, keywordData, searchQueryData] = await Promise.all([
    fetchReport(accessToken, developerToken, accountId, customerId, "CampaignPerformanceReport", CAMPAIGN_COLUMNS, startDate, endDate),
    fetchReport(accessToken, developerToken, accountId, customerId, "KeywordPerformanceReport", KEYWORD_COLUMNS, startDate, endDate),
    fetchReport(accessToken, developerToken, accountId, customerId, "SearchQueryPerformanceReport", SEARCH_QUERY_COLUMNS, startDate, endDate)
      .catch((err) => {
        console.warn(`[msads-sync] SearchQuery report failed (non-fatal):`, err.message);
        return [] as Record<string, string>[];
      }),
  ]);

  // Map to BQ schema
  const campaignRows = campaignData.map(mapCampaignRow);
  const keywordRows = keywordData.map(mapKeywordRow);
  const searchQueryRows = searchQueryData.map(mapSearchQueryRow);

  // Log sample rows for debugging
  if (campaignData.length > 0) {
    console.log(`[msads-sync] Sample campaign raw row:`, JSON.stringify(campaignData[0]));
  }

  // Extract currency from campaign data
  const currencyCode = campaignData.length > 0 ? (campaignData[0]["CurrencyCode"] || "USD") : "USD";
  console.log(`[msads-sync] Currency: ${currencyCode}`);

  console.log(`[msads-sync] Fetched: ${campaignRows.length} campaign, ${keywordRows.length} keyword, ${searchQueryRows.length} search query rows`);

  // Delete + streaming insert (fast). Daily dedup cron cleans any duplicates.
  const fqDataset = `\`${projectId}.${datasetId}\``;
  const dataset = bq.dataset(datasetId);

  const deleteResults = await Promise.all([
    campaignRows.length > 0 ? safeDelete(bq, `DELETE FROM ${fqDataset}.campaign_performance WHERE stats_date >= '${startDate}' AND stats_date <= '${endDate}'`, "msads-sync") : true,
    keywordRows.length > 0 ? safeDelete(bq, `DELETE FROM ${fqDataset}.keyword_performance WHERE stats_date >= '${startDate}' AND stats_date <= '${endDate}'`, "msads-sync") : true,
    searchQueryRows.length > 0 ? safeDelete(bq, `DELETE FROM ${fqDataset}.search_query_performance WHERE stats_date >= '${startDate}' AND stats_date <= '${endDate}'`, "msads-sync") : true,
  ]);
  const [campaignDeleteOk, keywordDeleteOk, searchQueryDeleteOk] = deleteResults;

  const insertTasks: Promise<unknown>[] = [];
  if (campaignRows.length > 0 && campaignDeleteOk) {
    insertTasks.push(dataset.table("campaign_performance").insert(campaignRows));
  }
  if (keywordRows.length > 0 && keywordDeleteOk) {
    insertTasks.push(dataset.table("keyword_performance").insert(keywordRows));
  }
  if (searchQueryRows.length > 0 && searchQueryDeleteOk) {
    insertTasks.push(dataset.table("search_query_performance").insert(searchQueryRows));
  }

  const accountRows = [{
    account_id: accountId,
    account_name: `Account ${accountId}`,
    currency_code: currencyCode,
    last_synced_at: new Date().toISOString(),
  }];
  await safeDelete(bq, `DELETE FROM ${fqDataset}.account_info WHERE TRUE`, "msads-sync");
  insertTasks.push(dataset.table("account_info").insert(accountRows));
  await Promise.all(insertTasks);

  console.log(`[msads-sync] Sync complete for account ${accountId}`);
  return {
    campaignRows: campaignRows.length,
    keywordRows: keywordRows.length,
    searchQueryRows: searchQueryRows.length,
  };
}

// ---------------------------------------------------------------------------
// Transfer status
// ---------------------------------------------------------------------------

export interface MsAdsDataStatus {
  datasetId: string;
  hasData: boolean;
  tables: string[];
}

export async function checkMsAdsDataStatus(
  accountId: string,
): Promise<MsAdsDataStatus> {
  const bq = getBqClient();
  const datasetId = getMsAdsDataset(accountId);

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
