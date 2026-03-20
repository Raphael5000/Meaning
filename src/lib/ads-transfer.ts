import { DataTransferServiceClient } from "@google-cloud/bigquery-data-transfer";
import { BigQuery } from "@google-cloud/bigquery";

// ---------------------------------------------------------------------------
// Client singletons
// ---------------------------------------------------------------------------

let _dtsClient: DataTransferServiceClient | null = null;

function getDtsClient(): DataTransferServiceClient {
  if (_dtsClient) return _dtsClient;

  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS env var is not set");

  const credentials = JSON.parse(raw);
  _dtsClient = new DataTransferServiceClient({
    projectId: credentials.project_id,
    credentials,
  });
  return _dtsClient;
}

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
// DTS versionInfo OAuth URL
// ---------------------------------------------------------------------------

/**
 * Get the OAuth URL that the user must visit to generate a `versionInfo` token
 * for DTS. The Google Ads data source requires specific scopes.
 * After consent, Google redirects to the redirect_uri with `version_info` param.
 */
export function getDtsAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const scopes = encodeURIComponent(
    "https://www.googleapis.com/auth/bigquery https://www.googleapis.com/auth/adwords"
  );

  // Use urn:ietf:wg:oauth:2.0:oob so Google shows the version_info on a page
  // Our app will redirect from that page via the state parameter
  return `https://bigquery.cloud.google.com/datatransfer/oauthz/auth?client_id=${encodeURIComponent(clientId)}&scope=${scopes}&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=version_info`;
}

// ---------------------------------------------------------------------------
// DTS transfer creation (programmatic)
// ---------------------------------------------------------------------------

export interface CreateAdsTransferResult {
  transferConfigName: string;
  datasetId: string;
}

/**
 * Create a BigQuery Data Transfer Service config for Google Ads.
 * Requires a `versionInfo` token obtained from the DTS OAuth flow.
 */
export async function createAdsTransfer(
  customerId: string,
  versionInfo: string,
  backfillDays = 90,
): Promise<CreateAdsTransferResult> {
  const projectId = getProjectId();
  const datasetId = getAdsDataset(customerId);

  await ensureDataset(datasetId);

  const client = getDtsClient();
  const parent = `projects/${projectId}/locations/us`;

  const [transferConfig] = await client.createTransferConfig({
    parent,
    transferConfig: {
      displayName: `Google Ads - ${customerId}`,
      dataSourceId: "google_ads",
      destinationDatasetId: datasetId,
      params: {
        fields: {
          customer_id: { stringValue: customerId },
        },
      },
      schedule: "every 24 hours",
      dataRefreshWindowDays: 3,
    },
    versionInfo,
  });

  const transferConfigName = transferConfig!.name!;
  console.log(`[ads-transfer] Created DTS config: ${transferConfigName}`);

  // Trigger backfill
  if (backfillDays > 0) {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - backfillDays);
    const endTime = new Date();
    endTime.setDate(endTime.getDate() - 1);
    endTime.setHours(23, 59, 59, 0);

    await client.startManualTransferRuns({
      parent: transferConfigName,
      requestedTimeRange: {
        startTime: { seconds: Math.floor(startTime.getTime() / 1000) },
        endTime: { seconds: Math.floor(endTime.getTime() / 1000) },
      },
    });
    console.log(`[ads-transfer] Triggered ${backfillDays}-day backfill`);
  }

  return { transferConfigName, datasetId };
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
    const adsTables = tableNames.filter((t) => t.startsWith("ads_") || t.startsWith("Ads"));
    return { datasetId, hasData: adsTables.length > 0, tables: tableNames };
  } catch {
    return { datasetId, hasData: false, tables: [] };
  }
}
