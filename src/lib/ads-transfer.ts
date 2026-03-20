import { BigQuery } from "@google-cloud/bigquery";

// ---------------------------------------------------------------------------
// Client singleton
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
 * Get the BigQuery dataset name for a Google Ads customer.
 * Format: ads_{customerId} (customer ID without dashes)
 */
export function getAdsDataset(customerId: string): string {
  return `ads_${customerId.replace(/-/g, "")}`;
}

/**
 * Ensure the target BigQuery dataset exists, creating it if necessary.
 */
export async function ensureDataset(datasetId: string): Promise<void> {
  const bq = getBqClient();
  const dataset = bq.dataset(datasetId);
  const [exists] = await dataset.exists();
  if (!exists) {
    await bq.createDataset(datasetId, { location: "US" });
    console.log(`[ads-transfer] Created dataset: ${datasetId}`);
  }
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

export interface SetupAdsResult {
  datasetId: string;
  setupUrl: string;
}

/**
 * Prepare for Google Ads DTS by creating the target dataset and
 * returning a BigQuery Console URL where the user completes the
 * DTS transfer setup (which requires their OAuth consent in-browser).
 */
export async function prepareAdsTransfer(
  customerId: string,
): Promise<SetupAdsResult> {
  const projectId = getProjectId();
  const datasetId = getAdsDataset(customerId);

  await ensureDataset(datasetId);

  // BigQuery Data Transfer setup page
  const setupUrl = `https://console.cloud.google.com/bigquery/transfers?project=${projectId}`;

  return { datasetId, setupUrl };
}

// ---------------------------------------------------------------------------
// Transfer status (checks if data has arrived in the dataset)
// ---------------------------------------------------------------------------

export interface AdsDataStatus {
  datasetId: string;
  hasData: boolean;
  tables: string[];
}

/**
 * Check if a Google Ads dataset has data by listing its tables.
 * DTS creates tables like ads_Campaign, ads_ClickStats, etc.
 */
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

    // Consider it "has data" if at least one ads_ table exists
    const adsTables = tableNames.filter((t) => t.startsWith("ads_") || t.startsWith("Ads"));
    return { datasetId, hasData: adsTables.length > 0, tables: tableNames };
  } catch {
    return { datasetId, hasData: false, tables: [] };
  }
}
