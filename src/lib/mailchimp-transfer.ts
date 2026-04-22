import { BigQuery } from "@google-cloud/bigquery";
import { getMailchimpCredentials } from "@/lib/mailchimp-token";
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

export function getMailchimpDataset(listId: string): string {
  return `mailchimp_${listId.replace(/[^a-zA-Z0-9]/g, "")}`;
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
    } catch { /* Default to EU */ }
    await bq.createDataset(datasetId, { location });
    console.log(`[mailchimp-transfer] Created dataset: ${datasetId} in ${location}`);
  }
}

// ---------------------------------------------------------------------------
// Table schemas
// ---------------------------------------------------------------------------

const TABLE_SCHEMAS: Record<string, { fields: { name: string; type: string }[]; partition?: string }> = {
  campaign_reports: {
    partition: "send_date",
    fields: [
      { name: "send_date", type: "DATE" },
      { name: "campaign_id", type: "STRING" },
      { name: "campaign_title", type: "STRING" },
      { name: "subject_line", type: "STRING" },
      { name: "emails_sent", type: "INT64" },
      { name: "opens_total", type: "INT64" },
      { name: "unique_opens", type: "INT64" },
      { name: "open_rate", type: "FLOAT64" },
      { name: "proxy_excluded_open_rate", type: "FLOAT64" },
      { name: "clicks_total", type: "INT64" },
      { name: "unique_clicks", type: "INT64" },
      { name: "click_rate", type: "FLOAT64" },
      { name: "hard_bounces", type: "INT64" },
      { name: "soft_bounces", type: "INT64" },
      { name: "unsubscribed", type: "INT64" },
      { name: "total_revenue", type: "FLOAT64" },
    ],
  },
  audience_stats: {
    partition: "stats_date",
    fields: [
      { name: "stats_date", type: "DATE" },
      { name: "list_id", type: "STRING" },
      { name: "list_name", type: "STRING" },
      { name: "member_count", type: "INT64" },
      { name: "total_contacts", type: "INT64" },
      { name: "unsubscribe_count", type: "INT64" },
      { name: "cleaned_count", type: "INT64" },
      { name: "campaign_count", type: "INT64" },
      { name: "open_rate", type: "FLOAT64" },
      { name: "click_rate", type: "FLOAT64" },
    ],
  },
  audience_growth: {
    partition: "month_date",
    fields: [
      { name: "month_date", type: "DATE" },
      { name: "list_id", type: "STRING" },
      { name: "subscribed", type: "INT64" },
      { name: "unsubscribed", type: "INT64" },
      { name: "cleaned", type: "INT64" },
      { name: "pending", type: "INT64" },
      { name: "deleted", type: "INT64" },
    ],
  },
  mc_account_info: {
    fields: [
      { name: "account_name", type: "STRING" },
      { name: "list_id", type: "STRING" },
      { name: "list_name", type: "STRING" },
      { name: "dc", type: "STRING" },
      { name: "last_synced_at", type: "TIMESTAMP" },
    ],
  },
};

export const MAILCHIMP_KEY_COLUMNS: Record<string, string[]> = {
  campaign_reports: ["campaign_id"],
  audience_stats: ["stats_date", "list_id"],
  audience_growth: ["month_date", "list_id"],
  mc_account_info: ["list_id"],
};

// ---------------------------------------------------------------------------
// Table management
// ---------------------------------------------------------------------------

export async function ensureMailchimpTables(datasetId: string): Promise<void> {
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
      options.timePartitioning = { type: "DAY", field: schema.partition };
    }
    await table.create(options);
    console.log(`[mailchimp-transfer] Created table: ${datasetId}.${tableName}`);
  }
}

// ---------------------------------------------------------------------------
// Mailchimp API helper
// ---------------------------------------------------------------------------

async function mailchimpGet(apiEndpoint: string, path: string, accessToken: string): Promise<unknown> {
  const url = `${apiEndpoint}/3.0${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mailchimp API error ${res.status}: ${body.slice(0, 500)}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Sync orchestrator
// ---------------------------------------------------------------------------

export interface MailchimpSyncResult {
  campaignRows: number;
  audienceRows: number;
  growthRows: number;
}

/**
 * Sync Mailchimp data into BigQuery for a given audience/list.
 * Fetches campaigns, audience stats, and growth history.
 */
export async function syncMailchimpData(
  userId: string,
  listId: string,
): Promise<MailchimpSyncResult> {
  const creds = await getMailchimpCredentials(userId);
  if (!creds) throw new Error(`No Mailchimp credentials for user ${userId}`);

  const { accessToken, apiEndpoint, dc } = creds;
  const datasetId = getMailchimpDataset(listId);
  const bq = getBqClient();
  const projectId = getProjectId();
  const today = new Date().toISOString().split("T")[0];

  console.log(`[mailchimp-sync] Starting sync for list ${listId} (dc: ${dc})`);

  // ── 1. Campaign reports ──
  let campaignRows: Record<string, unknown>[] = [];
  try {
    // Fetch sent campaigns for this list
    const campaignsData = (await mailchimpGet(
      apiEndpoint,
      `/campaigns?list_id=${listId}&status=sent&count=100&sort_field=send_time&sort_dir=DESC`,
      accessToken
    )) as {
      campaigns?: Array<{
        id: string;
        settings?: { title?: string; subject_line?: string };
        send_time?: string;
        emails_sent?: number;
        report_summary?: {
          opens?: number;
          unique_opens?: number;
          open_rate?: number;
          clicks?: number;
          subscriber_clicks?: number;
          click_rate?: number;
        };
      }>;
    };

    // Fetch full report for each campaign (has bounce/unsub/revenue data)
    for (const campaign of campaignsData.campaigns ?? []) {
      if (!campaign.send_time) continue;
      try {
        const report = (await mailchimpGet(
          apiEndpoint,
          `/reports/${campaign.id}`,
          accessToken
        )) as {
          opens?: { opens_total?: number; unique_opens?: number; open_rate?: number; proxy_excluded_open_rate?: number };
          clicks?: { clicks_total?: number; unique_clicks?: number; click_rate?: number };
          bounces?: { hard_bounces?: number; soft_bounces?: number };
          unsubscribed?: number;
          ecommerce?: { total_revenue?: number };
          emails_sent?: number;
          campaign_title?: string;
          subject_line?: string;
          send_time?: string;
        };

        const sendDate = report.send_time
          ? report.send_time.split("T")[0]
          : campaign.send_time.split("T")[0];

        campaignRows.push({
          send_date: sendDate,
          campaign_id: campaign.id,
          campaign_title: report.campaign_title ?? campaign.settings?.title ?? "",
          subject_line: report.subject_line ?? campaign.settings?.subject_line ?? "",
          emails_sent: Number(report.emails_sent ?? campaign.emails_sent ?? 0),
          opens_total: Number(report.opens?.opens_total ?? 0),
          unique_opens: Number(report.opens?.unique_opens ?? 0),
          open_rate: Number(report.opens?.open_rate ?? 0),
          proxy_excluded_open_rate: Number(report.opens?.proxy_excluded_open_rate ?? 0),
          clicks_total: Number(report.clicks?.clicks_total ?? 0),
          unique_clicks: Number(report.clicks?.unique_clicks ?? 0),
          click_rate: Number(report.clicks?.click_rate ?? 0),
          hard_bounces: Number(report.bounces?.hard_bounces ?? 0),
          soft_bounces: Number(report.bounces?.soft_bounces ?? 0),
          unsubscribed: Number(report.unsubscribed ?? 0),
          total_revenue: Number(report.ecommerce?.total_revenue ?? 0),
        });
      } catch (err) {
        console.warn(`[mailchimp-sync] Report fetch failed for campaign ${campaign.id}:`, (err as Error).message);
      }
    }
  } catch (err) {
    console.warn(`[mailchimp-sync] Campaigns fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 2. Audience/list stats (daily snapshot) ──
  let audienceRows: Record<string, unknown>[] = [];
  try {
    const listData = (await mailchimpGet(
      apiEndpoint,
      `/lists/${listId}`,
      accessToken
    )) as {
      id: string;
      name: string;
      stats?: {
        member_count?: number;
        total_contacts?: number;
        unsubscribe_count?: number;
        cleaned_count?: number;
        campaign_count?: number;
        open_rate?: number;
        click_rate?: number;
      };
    };

    const stats = listData.stats ?? {};
    audienceRows.push({
      stats_date: today,
      list_id: listData.id,
      list_name: listData.name ?? "",
      member_count: Number(stats.member_count ?? 0),
      total_contacts: Number(stats.total_contacts ?? 0),
      unsubscribe_count: Number(stats.unsubscribe_count ?? 0),
      cleaned_count: Number(stats.cleaned_count ?? 0),
      campaign_count: Number(stats.campaign_count ?? 0),
      open_rate: Number(stats.open_rate ?? 0),
      click_rate: Number(stats.click_rate ?? 0),
    });

    // Also update mc_account_info
    const accountInfoRows = [{
      account_name: listData.name ?? "",
      list_id: listData.id,
      list_name: listData.name ?? "",
      dc,
      last_synced_at: new Date().toISOString(),
    }];

    const fqDataset = `\`${projectId}.${datasetId}\``;
    await safeDelete(bq, `DELETE FROM ${fqDataset}.mc_account_info WHERE TRUE`, "mailchimp-sync");
    await bq.dataset(datasetId).table("mc_account_info").insert(accountInfoRows).catch(() => {});
  } catch (err) {
    console.warn(`[mailchimp-sync] List stats fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 3. Audience growth history (monthly) ──
  let growthRows: Record<string, unknown>[] = [];
  try {
    const growthData = (await mailchimpGet(
      apiEndpoint,
      `/lists/${listId}/growth-history?count=24`,
      accessToken
    )) as {
      history?: Array<{
        month: string;
        subscribed?: number;
        unsubscribed?: number;
        cleaned?: number;
        pending?: number;
        deleted?: number;
      }>;
    };

    for (const entry of growthData.history ?? []) {
      // month format is "YYYY-MM", convert to "YYYY-MM-01" for DATE
      growthRows.push({
        month_date: `${entry.month}-01`,
        list_id: listId,
        subscribed: Number(entry.subscribed ?? 0),
        unsubscribed: Number(entry.unsubscribed ?? 0),
        cleaned: Number(entry.cleaned ?? 0),
        pending: Number(entry.pending ?? 0),
        deleted: Number(entry.deleted ?? 0),
      });
    }
  } catch (err) {
    console.warn(`[mailchimp-sync] Growth history fetch failed (non-fatal):`, (err as Error).message);
  }

  console.log(
    `[mailchimp-sync] Fetched: ${campaignRows.length} campaigns, ${audienceRows.length} audience, ${growthRows.length} growth rows`
  );

  // Delete + streaming insert (fast). Daily dedup cron cleans any duplicates.
  const fqDataset = `\`${projectId}.${datasetId}\``;
  const dataset = bq.dataset(datasetId);

  const deleteTasks: Promise<boolean>[] = [];
  if (campaignRows.length > 0) {
    deleteTasks.push(safeDelete(bq, `DELETE FROM ${fqDataset}.campaign_reports WHERE TRUE`, "mailchimp-sync"));
  }
  if (audienceRows.length > 0) {
    deleteTasks.push(safeDelete(bq, `DELETE FROM ${fqDataset}.audience_stats WHERE stats_date = '${today}'`, "mailchimp-sync"));
  }
  if (growthRows.length > 0) {
    deleteTasks.push(safeDelete(bq, `DELETE FROM ${fqDataset}.audience_growth WHERE TRUE`, "mailchimp-sync"));
  }
  const deleteResults = await Promise.all(deleteTasks);

  const insertTasks: Promise<unknown>[] = [];
  let di = 0;
  if (campaignRows.length > 0 && deleteResults[di++]) {
    insertTasks.push(dataset.table("campaign_reports").insert(campaignRows));
  }
  if (audienceRows.length > 0 && deleteResults[di++]) {
    insertTasks.push(dataset.table("audience_stats").insert(audienceRows));
  }
  if (growthRows.length > 0 && deleteResults[di++]) {
    insertTasks.push(dataset.table("audience_growth").insert(growthRows));
  }
  await Promise.all(insertTasks);

  console.log(`[mailchimp-sync] Sync complete for list ${listId}`);
  return {
    campaignRows: campaignRows.length,
    audienceRows: audienceRows.length,
    growthRows: growthRows.length,
  };
}

// ---------------------------------------------------------------------------
// Data status check
// ---------------------------------------------------------------------------

export interface MailchimpDataStatus {
  datasetId: string;
  hasData: boolean;
  tables: string[];
}

export async function checkMailchimpDataStatus(
  listId: string,
): Promise<MailchimpDataStatus> {
  const bq = getBqClient();
  const datasetId = getMailchimpDataset(listId);

  try {
    const dataset = bq.dataset(datasetId);
    const [exists] = await dataset.exists();
    if (!exists) return { datasetId, hasData: false, tables: [] };

    const [tables] = await dataset.getTables();
    const tableNames = tables.map((t) => t.id || "").filter(Boolean);
    const hasExpected = Object.keys(TABLE_SCHEMAS).some((t) => tableNames.includes(t));
    return { datasetId, hasData: hasExpected, tables: tableNames };
  } catch {
    return { datasetId, hasData: false, tables: [] };
  }
}
