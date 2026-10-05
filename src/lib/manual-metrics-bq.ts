import { BigQuery } from "@google-cloud/bigquery";
import { prisma } from "@/lib/prisma";

/**
 * Manual metrics live in Postgres, so nothing outside this app could read them.
 * The Hivory portal reads reports from BigQuery only, so every manual entry is
 * mirrored into meaning_manual.entries.
 *
 * The table is replaced whole on every run (CREATE OR REPLACE TABLE from one
 * query), never appended to: a run can't duplicate rows, and a deleted entry
 * disappears from BigQuery on the next run.
 */

const DATASET = "meaning_manual";
const TABLE = "entries";
const LOCATION = "EU";

type Row = {
  org_id: string;
  org_name: string;
  metric_id: string;
  metric: string;
  display_format: string;
  period: string;
  month: string;
  value: number;
  note: string | null;
  updated_at: string;
};

const ROW_TYPES = {
  org_id: "STRING",
  org_name: "STRING",
  metric_id: "STRING",
  metric: "STRING",
  display_format: "STRING",
  period: "STRING",
  month: "DATE",
  value: "FLOAT64",
  note: "STRING",
  updated_at: "TIMESTAMP",
};

function client(): BigQuery {
  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS not set");
  const credentials = JSON.parse(raw);
  return new BigQuery({ projectId: credentials.project_id, credentials });
}

async function readRows(): Promise<Row[]> {
  const entries = await prisma.manualMetricEntry.findMany({
    include: { metric: { include: { org: { select: { id: true, name: true } } } } },
    orderBy: [{ metricId: "asc" }, { period: "asc" }],
  });
  return entries.map((e) => ({
    org_id: e.metric.org.id,
    org_name: e.metric.org.name,
    metric_id: e.metricId,
    metric: e.metric.name,
    display_format: e.metric.displayFormat,
    period: e.period,
    month: `${e.period}-01`,
    value: e.value,
    note: e.note,
    updated_at: e.updatedAt.toISOString(),
  }));
}

/** Replace meaning_manual.entries with every manual entry. Returns the row count. */
export async function syncManualMetricsToBigQuery(): Promise<number> {
  const bq = client();
  const project = bq.projectId;

  const dataset = bq.dataset(DATASET);
  const [exists] = await dataset.exists();
  if (!exists) await bq.createDataset(DATASET, { location: LOCATION });

  const rows = await readRows();
  const [job] = await bq.createQueryJob({
    query: `CREATE OR REPLACE TABLE \`${project}.${DATASET}.${TABLE}\`
      PARTITION BY DATE_TRUNC(month, MONTH)
      OPTIONS (description = "Mirror of Meaning's manual metric entries. Replaced whole on every sync; edit in Meaning, never here.")
      AS SELECT r.*, CURRENT_TIMESTAMP() AS synced_at FROM UNNEST(@rows) AS r`,
    params: { rows },
    types: { rows: [ROW_TYPES] },
    location: LOCATION,
  });
  await job.getQueryResults();
  return rows.length;
}

// One sync at a time. A save while a sync is running marks it dirty, and the
// sync runs once more when it finishes, so the last write always reaches
// BigQuery and an older snapshot can never land after a newer one.
let running = false;
let dirty = false;

/** Fire-and-forget after a manual metric changes. Never throws. */
export function queueManualMetricsSync(): void {
  if (running) {
    dirty = true;
    return;
  }
  running = true;
  (async () => {
    try {
      do {
        dirty = false;
        const n = await syncManualMetricsToBigQuery();
        console.log("[manual-metrics] synced %d entries to BigQuery", n);
      } while (dirty);
    } catch (err) {
      console.error("[manual-metrics] BigQuery sync failed:", (err as Error).message);
    } finally {
      running = false;
    }
  })();
}
