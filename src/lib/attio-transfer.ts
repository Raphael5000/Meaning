import { BigQuery } from "@google-cloud/bigquery";
import { getAttioApiKey } from "@/lib/attio-token";
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

export function getAttioDataset(orgId: string): string {
  return `attio_${orgId.replace(/[^a-zA-Z0-9]/g, "")}`;
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
    console.log(`[attio-transfer] Created dataset: ${datasetId} in ${location}`);
  }
}

// ---------------------------------------------------------------------------
// Table schemas
// ---------------------------------------------------------------------------

const TABLE_SCHEMAS: Record<
  string,
  { fields: { name: string; type: string }[]; partition?: string }
> = {
  people: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "record_id", type: "STRING" },
      { name: "name", type: "STRING" },
      { name: "email", type: "STRING" },
      { name: "phone", type: "STRING" },
      { name: "company", type: "STRING" },
      { name: "created_at", type: "TIMESTAMP" },
      { name: "web_url", type: "STRING" },
    ],
  },
  companies: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "record_id", type: "STRING" },
      { name: "name", type: "STRING" },
      { name: "domain", type: "STRING" },
      { name: "description", type: "STRING" },
      { name: "created_at", type: "TIMESTAMP" },
      { name: "web_url", type: "STRING" },
    ],
  },
  deals: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "record_id", type: "STRING" },
      { name: "name", type: "STRING" },
      { name: "stage", type: "STRING" },
      { name: "value", type: "FLOAT64" },
      { name: "currency", type: "STRING" },
      { name: "owner", type: "STRING" },
      { name: "channel", type: "STRING" },
      { name: "created_at", type: "TIMESTAMP" },
      { name: "web_url", type: "STRING" },
    ],
  },
  tasks: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "task_id", type: "STRING" },
      { name: "content", type: "STRING" },
      { name: "is_completed", type: "BOOLEAN" },
      { name: "deadline_at", type: "TIMESTAMP" },
      { name: "completed_at", type: "TIMESTAMP" },
      { name: "assignee", type: "STRING" },
      { name: "created_at", type: "TIMESTAMP" },
    ],
  },
  notes: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "note_id", type: "STRING" },
      { name: "title", type: "STRING" },
      { name: "content_plaintext", type: "STRING" },
      { name: "parent_object", type: "STRING" },
      { name: "parent_record_id", type: "STRING" },
      { name: "created_at", type: "TIMESTAMP" },
    ],
  },
  workspace_summary: {
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "total_people", type: "INT64" },
      { name: "total_companies", type: "INT64" },
      { name: "total_deals", type: "INT64" },
      { name: "total_tasks", type: "INT64" },
      { name: "open_tasks", type: "INT64" },
      { name: "total_notes", type: "INT64" },
      { name: "pipeline_value", type: "FLOAT64" },
      { name: "pipeline_currency", type: "STRING" },
      { name: "last_synced_at", type: "TIMESTAMP" },
    ],
  },
};

export async function ensureAttioTables(datasetId: string): Promise<void> {
  const bq = getBqClient();
  const dataset = bq.dataset(datasetId);

  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    const table = dataset.table(tableName);
    const [exists] = await table.exists();

    if (!exists) {
      const options: Record<string, unknown> = {
        schema: { fields: schema.fields },
      };
      if (schema.partition) {
        options.timePartitioning = { type: "DAY", field: schema.partition };
      }
      await table.create(options);
      console.log(`[attio-transfer] Created table: ${datasetId}.${tableName}`);
      continue;
    }

    // Add any missing columns to existing tables
    const [meta] = await table.getMetadata();
    const existingFields = (meta.schema?.fields ?? []) as { name: string }[];
    const existingNames = new Set(existingFields.map((f) => f.name));
    const missing = schema.fields.filter((f) => !existingNames.has(f.name));
    if (missing.length > 0) {
      meta.schema.fields = [...existingFields, ...missing];
      await table.setMetadata(meta);
      console.log(`[attio-transfer] Added columns to ${datasetId}.${tableName}: ${missing.map((f) => f.name).join(", ")}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Attio API helpers
// ---------------------------------------------------------------------------

const ATTIO_API_BASE = "https://api.attio.com/v2";

async function attioGet(apiKey: string, path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${ATTIO_API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Attio API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function attioPost(apiKey: string, path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${ATTIO_API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Attio API error ${res.status}: ${text}`);
  }
  return res.json();
}

/** Paginate through all records for an object */
async function fetchAllRecords(apiKey: string, objectSlug: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const data = (await attioPost(apiKey, `/objects/${objectSlug}/records/query`, {
      limit,
      offset,
    })) as { data?: Record<string, unknown>[] };

    const records = data.data ?? [];
    all.push(...records);

    if (records.length < limit) break;
    offset += limit;

    // Safety cap at 10,000 records
    if (all.length >= 10000) break;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Value extractors — Attio returns nested attribute values
// ---------------------------------------------------------------------------

function extractValue(values: Record<string, unknown>, key: string): string {
  const arr = values[key] as Array<Record<string, unknown>> | undefined;
  if (!arr || arr.length === 0) return "";

  const first = arr[0];

  // Personal name
  if (first.first_name || first.last_name || first.full_name) {
    return String(first.full_name || `${first.first_name || ""} ${first.last_name || ""}`.trim());
  }
  // Email
  if (first.email_address) return String(first.email_address);
  // Phone
  if (first.original_phone_number || first.phone_number) {
    return String(first.original_phone_number || first.phone_number);
  }
  // Domain
  if (first.domain) return String(first.domain);
  // Currency
  if (first.currency_value !== undefined) return String(first.currency_value);
  // Status / select
  if (first.status) {
    const status = first.status as Record<string, unknown>;
    return String(status.title || status.id || "");
  }
  if (first.option) {
    const opt = first.option as Record<string, unknown>;
    return String(opt.title || opt.id || "");
  }
  // Text / number
  if (first.value !== undefined) return String(first.value);
  // Record reference
  if (first.target_record_id) return String(first.target_record_id);

  return "";
}

function extractCurrency(values: Record<string, unknown>, key: string): { value: number; currency: string } {
  const arr = values[key] as Array<Record<string, unknown>> | undefined;
  if (!arr || arr.length === 0) return { value: 0, currency: "" };
  const first = arr[0];
  return {
    value: Number(first.currency_value ?? 0),
    currency: String(first.currency_code ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Sync orchestrator
// ---------------------------------------------------------------------------

export interface AttioSyncResult {
  peopleRows: number;
  companiesRows: number;
  dealsRows: number;
  tasksRows: number;
  notesRows: number;
}

export async function syncAttioData(
  userId: string,
  workspaceId: string,
): Promise<AttioSyncResult> {
  const apiKey = await getAttioApiKey(userId, workspaceId);
  if (!apiKey) throw new Error(`No Attio API key for user ${userId}, workspace ${workspaceId}`);

  const { prisma } = await import("@/lib/prisma");
  const ds = await prisma.dataSource.findFirst({
    where: { userId, type: "ATTIO", propertyId: workspaceId },
    select: { orgId: true },
  });
  const orgId = ds?.orgId ?? userId;
  const datasetId = getAttioDataset(orgId);

  const bq = getBqClient();
  const projectId = getProjectId();
  const today = new Date().toISOString().split("T")[0];

  console.log(`[attio-sync] Starting sync for workspace ${workspaceId}, snapshot ${today}`);

  await ensureDataset(datasetId);
  await ensureAttioTables(datasetId);

  const fqDataset = `\`${projectId}.${datasetId}\``;
  const dataset = bq.dataset(datasetId);
  const insertTasks: Promise<unknown>[] = [];

  // ── 1. People ──
  let peopleRows: Record<string, unknown>[] = [];
  try {
    const records = await fetchAllRecords(apiKey, "people");
    peopleRows = records.map((r) => {
      const values = (r.values || {}) as Record<string, unknown>;
      const id = r.id as Record<string, string>;
      return {
        snapshot_date: today,
        record_id: id?.record_id ?? "",
        name: extractValue(values, "name"),
        email: extractValue(values, "email_addresses"),
        phone: extractValue(values, "phone_numbers"),
        company: extractValue(values, "company"),
        created_at: r.created_at ?? null,
        web_url: r.web_url ?? "",
      };
    });
  } catch (err) {
    console.warn(`[attio-sync] People fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 2. Companies ──
  let companiesRows: Record<string, unknown>[] = [];
  try {
    const records = await fetchAllRecords(apiKey, "companies");
    companiesRows = records.map((r) => {
      const values = (r.values || {}) as Record<string, unknown>;
      const id = r.id as Record<string, string>;
      return {
        snapshot_date: today,
        record_id: id?.record_id ?? "",
        name: extractValue(values, "name"),
        domain: extractValue(values, "domains"),
        description: extractValue(values, "description"),
        created_at: r.created_at ?? null,
        web_url: r.web_url ?? "",
      };
    });
  } catch (err) {
    console.warn(`[attio-sync] Companies fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 3. Deals ──
  let dealsRows: Record<string, unknown>[] = [];
  try {
    const records = await fetchAllRecords(apiKey, "deals");

    // Debug: log attribute keys from first deal to find correct slugs
    if (records.length > 0) {
      const firstValues = (records[0].values || {}) as Record<string, unknown>;
      console.log(`[attio-sync] Deal attribute keys: ${Object.keys(firstValues).join(", ")}`);
      // Log any key that looks like it could be "channel"
      for (const [k, v] of Object.entries(firstValues)) {
        if (k.toLowerCase().includes("channel") || k.toLowerCase().includes("chan")) {
          console.log(`[attio-sync] Found channel-like key "${k}":`, JSON.stringify(v));
        }
      }
    }

    // Build lookup for record-reference attributes (e.g. Channel)
    // Collect all referenced record IDs grouped by target object
    const refLookups = new Map<string, Map<string, string>>(); // objectSlug → recordId → name
    const refsToResolve = new Map<string, Set<string>>(); // objectSlug → Set<recordId>
    for (const r of records) {
      const values = (r.values || {}) as Record<string, unknown>;
      const channelArr = values.channel as Array<Record<string, unknown>> | undefined;
      if (channelArr?.[0]?.target_object && channelArr[0].target_record_id) {
        const obj = String(channelArr[0].target_object);
        const rid = String(channelArr[0].target_record_id);
        if (!refsToResolve.has(obj)) refsToResolve.set(obj, new Set());
        refsToResolve.get(obj)!.add(rid);
      }
    }
    // Fetch referenced records to get their names
    for (const [objSlug, ids] of refsToResolve) {
      const nameMap = new Map<string, string>();
      try {
        const refRecords = await fetchAllRecords(apiKey, objSlug);
        for (const rr of refRecords) {
          const rid = (rr.id as Record<string, string>)?.record_id;
          const vals = (rr.values || {}) as Record<string, unknown>;
          if (rid) nameMap.set(rid, extractValue(vals, "name") || rid);
        }
      } catch {
        // If we can't resolve, fall back to IDs
      }
      refLookups.set(objSlug, nameMap);
    }

    dealsRows = records.map((r) => {
      const values = (r.values || {}) as Record<string, unknown>;
      const id = r.id as Record<string, string>;
      const money = extractCurrency(values, "deal_value");

      // Resolve channel record reference to name
      let channel = "";
      const channelArr = values.channel as Array<Record<string, unknown>> | undefined;
      if (channelArr?.[0]?.target_record_id) {
        const obj = String(channelArr[0].target_object ?? "");
        const rid = String(channelArr[0].target_record_id);
        channel = refLookups.get(obj)?.get(rid) ?? rid;
      }

      return {
        snapshot_date: today,
        record_id: id?.record_id ?? "",
        name: extractValue(values, "name"),
        stage: extractValue(values, "stage"),
        value: money.value,
        currency: money.currency,
        owner: extractValue(values, "owner"),
        channel,
        created_at: r.created_at ?? null,
        web_url: r.web_url ?? "",
      };
    });
  } catch (err) {
    console.warn(`[attio-sync] Deals fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 4. Tasks ──
  let tasksRowsArr: Record<string, unknown>[] = [];
  try {
    const data = (await attioGet(apiKey, "/tasks", { limit: "500" })) as {
      data?: Array<Record<string, unknown>>;
    };
    tasksRowsArr = (data.data ?? []).map((t) => {
      const id = t.id as Record<string, string>;
      const assignees = t.assignees as Array<Record<string, unknown>> | undefined;
      return {
        snapshot_date: today,
        task_id: id?.task_id ?? "",
        content: String(t.content_plaintext ?? "").slice(0, 5000),
        is_completed: t.is_completed ?? false,
        deadline_at: t.deadline_at ?? null,
        completed_at: t.completed_at ?? null,
        assignee: assignees?.[0] ? String((assignees[0].id as Record<string, string>)?.workspace_member_id ?? "") : "",
        created_at: t.created_at ?? null,
      };
    });
  } catch (err) {
    console.warn(`[attio-sync] Tasks fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 5. Notes (last 200) ──
  let notesRows: Record<string, unknown>[] = [];
  try {
    const data = (await attioGet(apiKey, "/notes", { limit: "50" })) as {
      data?: Array<Record<string, unknown>>;
    };
    notesRows = (data.data ?? []).map((n) => {
      const id = n.id as Record<string, string>;
      return {
        snapshot_date: today,
        note_id: id?.note_id ?? "",
        title: String(n.title ?? ""),
        content_plaintext: String(n.content_plaintext ?? "").slice(0, 5000),
        parent_object: String(n.parent_object ?? ""),
        parent_record_id: String(n.parent_record_id ?? ""),
        created_at: n.created_at ?? null,
      };
    });
  } catch (err) {
    console.warn(`[attio-sync] Notes fetch failed (non-fatal):`, (err as Error).message);
  }

  console.log(
    `[attio-sync] Fetched: ${peopleRows.length} people, ${companiesRows.length} companies, ${dealsRows.length} deals, ${tasksRowsArr.length} tasks, ${notesRows.length} notes`
  );

  // ── Write to BigQuery ──
  if (peopleRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.people WHERE snapshot_date = '${today}'`, "attio-sync");
    if (ok) insertTasks.push(dataset.table("people").insert(peopleRows));
  }
  if (companiesRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.companies WHERE snapshot_date = '${today}'`, "attio-sync");
    if (ok) insertTasks.push(dataset.table("companies").insert(companiesRows));
  }
  if (dealsRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.deals WHERE snapshot_date = '${today}'`, "attio-sync");
    if (ok) insertTasks.push(dataset.table("deals").insert(dealsRows));
  }
  if (tasksRowsArr.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.tasks WHERE snapshot_date = '${today}'`, "attio-sync");
    if (ok) insertTasks.push(dataset.table("tasks").insert(tasksRowsArr));
  }
  if (notesRows.length > 0) {
    const ok = await safeDelete(bq, `DELETE FROM ${fqDataset}.notes WHERE snapshot_date = '${today}'`, "attio-sync");
    if (ok) insertTasks.push(dataset.table("notes").insert(notesRows));
  }

  // ── Workspace summary ──
  const pipelineValue = dealsRows.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const pipelineCurrency = dealsRows.find((d) => d.currency)?.currency ?? "";
  const summaryRow = {
    snapshot_date: today,
    total_people: peopleRows.length,
    total_companies: companiesRows.length,
    total_deals: dealsRows.length,
    total_tasks: tasksRowsArr.length,
    open_tasks: tasksRowsArr.filter((t) => !t.is_completed).length,
    total_notes: notesRows.length,
    pipeline_value: pipelineValue,
    pipeline_currency: pipelineCurrency,
    last_synced_at: new Date().toISOString(),
  };
  await safeDelete(bq, `DELETE FROM ${fqDataset}.workspace_summary WHERE TRUE`, "attio-sync");
  insertTasks.push(dataset.table("workspace_summary").insert([summaryRow]));

  await Promise.all(insertTasks);

  console.log(`[attio-sync] Sync complete for workspace ${workspaceId}`);
  return {
    peopleRows: peopleRows.length,
    companiesRows: companiesRows.length,
    dealsRows: dealsRows.length,
    tasksRows: tasksRowsArr.length,
    notesRows: notesRows.length,
  };
}
