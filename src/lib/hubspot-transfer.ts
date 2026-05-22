import { BigQuery } from "@google-cloud/bigquery";
import { getHubSpotApiKey } from "@/lib/hubspot-token";
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

export function getHubSpotDataset(orgId: string): string {
  return `hubspot_${orgId.replace(/[^a-zA-Z0-9]/g, "")}`;
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
    console.log(`[hubspot-transfer] Created dataset: ${datasetId} in ${location}`);
  }
}

// ---------------------------------------------------------------------------
// Table schemas
// ---------------------------------------------------------------------------

const TABLE_SCHEMAS: Record<
  string,
  { fields: { name: string; type: string }[]; partition?: string }
> = {
  contacts: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "contact_id", type: "STRING" },
      { name: "email", type: "STRING" },
      { name: "firstname", type: "STRING" },
      { name: "lastname", type: "STRING" },
      { name: "phone", type: "STRING" },
      { name: "company", type: "STRING" },
      { name: "lifecyclestage", type: "STRING" },
      { name: "created_at", type: "TIMESTAMP" },
      { name: "last_modified", type: "TIMESTAMP" },
    ],
  },
  companies: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "company_id", type: "STRING" },
      { name: "name", type: "STRING" },
      { name: "domain", type: "STRING" },
      { name: "industry", type: "STRING" },
      { name: "num_employees", type: "INT64" },
      { name: "annual_revenue", type: "FLOAT64" },
      { name: "city", type: "STRING" },
      { name: "country", type: "STRING" },
      { name: "created_at", type: "TIMESTAMP" },
      { name: "last_modified", type: "TIMESTAMP" },
    ],
  },
  deals: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "deal_id", type: "STRING" },
      { name: "deal_name", type: "STRING" },
      { name: "deal_stage", type: "STRING" },
      { name: "pipeline", type: "STRING" },
      { name: "amount", type: "FLOAT64" },
      { name: "close_date", type: "DATE" },
      { name: "owner_id", type: "STRING" },
      { name: "created_at", type: "TIMESTAMP" },
      { name: "last_modified", type: "TIMESTAMP" },
    ],
  },
  crm_summary: {
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "total_contacts", type: "INT64" },
      { name: "total_companies", type: "INT64" },
      { name: "total_deals", type: "INT64" },
      { name: "open_deals", type: "INT64" },
      { name: "total_deal_value", type: "FLOAT64" },
      { name: "closed_won_deals", type: "INT64" },
      { name: "closed_won_value", type: "FLOAT64" },
      { name: "last_synced_at", type: "TIMESTAMP" },
    ],
  },
};

export async function ensureHubSpotTables(datasetId: string): Promise<void> {
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
    console.log(`[hubspot-transfer] Created table: ${datasetId}.${tableName}`);
  }
}

// ---------------------------------------------------------------------------
// HubSpot API helpers
// ---------------------------------------------------------------------------

const HUBSPOT_API_BASE = "https://api.hubapi.com";

async function hubspotGet(token: string, path: string): Promise<unknown> {
  const res = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${body}`);
  }
  return res.json();
}

/** Paginate through HubSpot CRM objects (up to 10k) */
async function fetchAllObjects(
  token: string,
  objectType: string,
  properties: string[],
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let after: string | undefined;
  const limit = 100;

  while (true) {
    let url = `/crm/v3/objects/${objectType}?limit=${limit}&properties=${properties.join(",")}`;
    if (after) url += `&after=${after}`;

    const data = (await hubspotGet(token, url)) as {
      results?: Record<string, unknown>[];
      paging?: { next?: { after?: string } };
    };

    const results = data.results ?? [];
    all.push(...results);

    const nextAfter = data.paging?.next?.after;
    if (!nextAfter || results.length < limit) break;
    after = nextAfter;

    // Safety cap at 10,000 records
    if (all.length >= 10000) break;
  }
  return all;
}

/** Fetch deal pipeline stage labels for stage ID → name resolution */
async function fetchPipelineStages(token: string): Promise<Map<string, string>> {
  const stageMap = new Map<string, string>();
  try {
    const data = (await hubspotGet(token, "/crm/v3/pipelines/deals")) as {
      results?: Array<{
        stages?: Array<{ stageId: string; label: string }>;
      }>;
    };
    for (const pipeline of data.results ?? []) {
      for (const stage of pipeline.stages ?? []) {
        stageMap.set(stage.stageId, stage.label);
      }
    }
  } catch (err) {
    console.warn("[hubspot-sync] Pipeline fetch failed (non-fatal):", (err as Error).message);
  }
  return stageMap;
}

// ---------------------------------------------------------------------------
// Sync orchestrator
// ---------------------------------------------------------------------------

export interface HubSpotSyncResult {
  contactsRows: number;
  companiesRows: number;
  dealsRows: number;
}

export async function syncHubSpotData(
  userId: string,
  hubspotId: string,
): Promise<HubSpotSyncResult> {
  const token = await getHubSpotApiKey(userId);
  if (!token) throw new Error(`No HubSpot token for user ${userId}`);

  const { prisma } = await import("@/lib/prisma");
  const ds = await prisma.dataSource.findFirst({
    where: { userId, type: "HUBSPOT", propertyId: hubspotId },
    select: { orgId: true },
  });
  const orgId = ds?.orgId ?? userId;
  const datasetId = getHubSpotDataset(orgId);

  const bq = getBqClient();
  const projectId = getProjectId();
  const today = new Date().toISOString().split("T")[0];

  console.log(`[hubspot-sync] Starting sync for ${hubspotId}, snapshot ${today}`);

  await ensureDataset(datasetId);
  await ensureHubSpotTables(datasetId);

  const fqDataset = `\`${projectId}.${datasetId}\``;
  const dataset = bq.dataset(datasetId);
  const insertTasks: Promise<unknown>[] = [];

  // Fetch pipeline stages for deal stage name resolution
  const stageMap = await fetchPipelineStages(token);

  // ── 1. Contacts ──
  let contactsRows: Record<string, unknown>[] = [];
  try {
    const records = await fetchAllObjects(token, "contacts", [
      "email", "firstname", "lastname", "phone", "company", "lifecyclestage", "createdate", "lastmodifieddate",
    ]);
    contactsRows = records.map((r) => {
      const props = (r.properties || {}) as Record<string, string | null>;
      return {
        snapshot_date: today,
        contact_id: String(r.id ?? ""),
        email: props.email ?? "",
        firstname: props.firstname ?? "",
        lastname: props.lastname ?? "",
        phone: props.phone ?? "",
        company: props.company ?? "",
        lifecyclestage: props.lifecyclestage ?? "",
        created_at: props.createdate ?? null,
        last_modified: props.lastmodifieddate ?? null,
      };
    });
  } catch (err) {
    console.warn("[hubspot-sync] Contacts fetch failed (non-fatal):", (err as Error).message);
  }

  // ── 2. Companies ──
  let companiesRows: Record<string, unknown>[] = [];
  try {
    const records = await fetchAllObjects(token, "companies", [
      "name", "domain", "industry", "numberofemployees", "annualrevenue", "city", "country", "createdate", "lastmodifieddate",
    ]);
    companiesRows = records.map((r) => {
      const props = (r.properties || {}) as Record<string, string | null>;
      return {
        snapshot_date: today,
        company_id: String(r.id ?? ""),
        name: props.name ?? "",
        domain: props.domain ?? "",
        industry: props.industry ?? "",
        num_employees: props.numberofemployees ? parseInt(props.numberofemployees, 10) || 0 : 0,
        annual_revenue: props.annualrevenue ? parseFloat(props.annualrevenue) || 0 : 0,
        city: props.city ?? "",
        country: props.country ?? "",
        created_at: props.createdate ?? null,
        last_modified: props.lastmodifieddate ?? null,
      };
    });
  } catch (err) {
    console.warn("[hubspot-sync] Companies fetch failed (non-fatal):", (err as Error).message);
  }

  // ── 3. Deals ──
  let dealsRows: Record<string, unknown>[] = [];
  try {
    const records = await fetchAllObjects(token, "deals", [
      "dealname", "dealstage", "pipeline", "amount", "closedate", "hubspot_owner_id", "createdate", "lastmodifieddate",
    ]);
    dealsRows = records.map((r) => {
      const props = (r.properties || {}) as Record<string, string | null>;
      const stageId = props.dealstage ?? "";
      return {
        snapshot_date: today,
        deal_id: String(r.id ?? ""),
        deal_name: props.dealname ?? "",
        deal_stage: stageMap.get(stageId) || stageId,
        pipeline: props.pipeline ?? "",
        amount: props.amount ? parseFloat(props.amount) || 0 : 0,
        close_date: props.closedate ? props.closedate.split("T")[0] : null,
        owner_id: props.hubspot_owner_id ?? "",
        created_at: props.createdate ?? null,
        last_modified: props.lastmodifieddate ?? null,
      };
    });
  } catch (err) {
    console.warn("[hubspot-sync] Deals fetch failed (non-fatal):", (err as Error).message);
  }

  console.log(
    `[hubspot-sync] Fetched: ${contactsRows.length} contacts, ${companiesRows.length} companies, ${dealsRows.length} deals`
  );

  // ── Write to BigQuery ──
  if (contactsRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.contacts WHERE snapshot_date = '${today}'`, "hubspot-sync");
    if (ok) insertTasks.push(dataset.table("contacts").insert(contactsRows));
  }
  if (companiesRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.companies WHERE snapshot_date = '${today}'`, "hubspot-sync");
    if (ok) insertTasks.push(dataset.table("companies").insert(companiesRows));
  }
  if (dealsRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.deals WHERE snapshot_date = '${today}'`, "hubspot-sync");
    if (ok) insertTasks.push(dataset.table("deals").insert(dealsRows));
  }

  // ── CRM summary ──
  // Determine closed-won deals by checking for common "closed won" stage names
  const closedWonNames = new Set(["closedwon", "closed won", "closed_won"]);
  const closedWonDeals = dealsRows.filter((d) => {
    const stage = String(d.deal_stage ?? "").toLowerCase();
    return closedWonNames.has(stage);
  });
  const openDeals = dealsRows.filter((d) => {
    const stage = String(d.deal_stage ?? "").toLowerCase();
    return !stage.includes("closed");
  });

  const summaryRow = {
    snapshot_date: today,
    total_contacts: contactsRows.length,
    total_companies: companiesRows.length,
    total_deals: dealsRows.length,
    open_deals: openDeals.length,
    total_deal_value: dealsRows.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
    closed_won_deals: closedWonDeals.length,
    closed_won_value: closedWonDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
    last_synced_at: new Date().toISOString(),
  };
  await safeDelete(bq, `DELETE FROM ${fqDataset}.crm_summary WHERE TRUE`, "hubspot-sync");
  insertTasks.push(dataset.table("crm_summary").insert([summaryRow]));

  await Promise.all(insertTasks);

  console.log(`[hubspot-sync] Sync complete for ${hubspotId}`);
  return {
    contactsRows: contactsRows.length,
    companiesRows: companiesRows.length,
    dealsRows: dealsRows.length,
  };
}
