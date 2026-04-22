import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import { mergeRows } from "@/lib/bq-helpers";

export const dynamic = "force-dynamic";

const DBT_DATASET = "dbt_meaning";
const TABLE_NAME = "exchange_rates";

const EXCHANGE_RATE_SCHEMA = [
  { name: "rate_date", type: "DATE" },
  { name: "base", type: "STRING" },
  { name: "target", type: "STRING" },
  { name: "rate", type: "FLOAT64" },
];

const EXCHANGE_RATE_KEYS = ["rate_date", "target"];

function getBqClient(): BigQuery {
  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS env var is not set");
  const credentials = JSON.parse(raw);
  return new BigQuery({ projectId: credentials.project_id, credentials });
}

/**
 * Ensure the exchange_rates table exists in the dbt_meaning dataset.
 */
async function ensureTable(): Promise<void> {
  const bq = getBqClient();
  const table = bq.dataset(DBT_DATASET).table(TABLE_NAME);
  const [exists] = await table.exists();
  if (!exists) {
    await table.create({
      schema: {
        fields: [
          { name: "rate_date", type: "DATE" },
          { name: "base", type: "STRING" },
          { name: "target", type: "STRING" },
          { name: "rate", type: "FLOAT64" },
        ],
      },
      timePartitioning: { type: "DAY", field: "rate_date" },
    });
    console.log("[exchange-rates] Created table dbt_meaning.exchange_rates");
  }
}

/**
 * Fetch exchange rates from frankfurter.app for a specific date.
 * Returns rates relative to USD.
 */
async function fetchRatesForDate(date: string): Promise<Record<string, number> | null> {
  const res = await fetch(`https://api.frankfurter.app/${date}?from=USD`);
  if (!res.ok) {
    console.error(`[exchange-rates] Failed to fetch rates for ${date}: ${res.status}`);
    return null;
  }
  const data = (await res.json()) as { rates: Record<string, number> };
  return data.rates;
}

/**
 * Insert rates into BigQuery for a given date using MERGE (idempotent, no duplicates).
 */
async function insertRates(date: string, rates: Record<string, number>): Promise<number> {
  const bq = getBqClient();
  const projectId = JSON.parse(process.env.GOOGLE_BIGQUERY_CREDENTIALS!).project_id;
  const fqTable = `\`${projectId}.${DBT_DATASET}.${TABLE_NAME}\``;

  // Build rows — include USD→USD = 1.0
  const rows = [
    { rate_date: date, base: "USD", target: "USD", rate: 1.0 },
    ...Object.entries(rates).map(([target, rate]) => ({
      rate_date: date,
      base: "USD",
      target,
      rate,
    })),
  ];

  await mergeRows(bq, fqTable, rows, EXCHANGE_RATE_KEYS, EXCHANGE_RATE_SCHEMA, "exchange-rates");
  return rows.length;
}

/**
 * Fill weekend/holiday gaps by carrying forward the last known rate.
 * Frankfurter only provides business day rates — this ensures every calendar day has a rate.
 * Uses MERGE to avoid creating duplicates if run multiple times.
 */
async function fillGaps(): Promise<void> {
  const bq = getBqClient();
  const projectId = JSON.parse(process.env.GOOGLE_BIGQUERY_CREDENTIALS!).project_id;
  const fqTable = `\`${projectId}.${DBT_DATASET}.${TABLE_NAME}\``;

  await bq.query({
    query: `
      MERGE ${fqTable} T
      USING (
        WITH all_dates AS (
          SELECT d FROM UNNEST(GENERATE_DATE_ARRAY(
            (SELECT MIN(rate_date) FROM ${fqTable}),
            CURRENT_DATE()
          )) AS d
        ),
        rates_with_gaps AS (
          SELECT d.d AS rate_date, t.target,
            LAST_VALUE(e.rate IGNORE NULLS) OVER (
              PARTITION BY t.target ORDER BY d.d
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS rate
          FROM all_dates d
          CROSS JOIN (SELECT DISTINCT target FROM ${fqTable}) t
          LEFT JOIN ${fqTable} e ON e.rate_date = d.d AND e.target = t.target
        )
        SELECT rate_date, 'USD' AS base, target, rate
        FROM rates_with_gaps
        WHERE rate IS NOT NULL
      ) S
      ON T.rate_date = S.rate_date AND T.target = S.target
      WHEN NOT MATCHED THEN INSERT (rate_date, base, target, rate)
        VALUES (S.rate_date, S.base, S.target, S.rate)
      WHEN MATCHED THEN UPDATE SET rate = S.rate, base = S.base
    `,
  });
  console.log("[exchange-rates] Gap fill complete");
}

/**
 * POST /api/exchange-rates/sync
 *
 * Syncs exchange rates into BigQuery. Supports:
 * - No body: syncs today's rates
 * - { from: "2025-01-01", to: "2025-03-01" }: backfill a date range
 *
 * Protected by CRON_SECRET (optional for local dev).
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTable();

    const body = await req.json().catch(() => ({})) as { from?: string; to?: string };
    const today = new Date().toISOString().split("T")[0];

    if (body.from && body.to) {
      // Backfill mode: fetch rates for each date in range
      const start = new Date(body.from);
      const end = new Date(body.to);
      let totalRows = 0;
      let daysProcessed = 0;

      // Frankfurter supports time-series: /from..to?from=USD
      const res = await fetch(
        `https://api.frankfurter.app/${body.from}..${body.to}?from=USD`
      );

      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch rates: ${res.status}` },
          { status: 502 }
        );
      }

      const data = (await res.json()) as {
        rates: Record<string, Record<string, number>>;
      };

      for (const [date, rates] of Object.entries(data.rates)) {
        const count = await insertRates(date, rates);
        totalRows += count;
        daysProcessed++;
      }

      await fillGaps();
      console.log(`[exchange-rates] Backfill complete: ${daysProcessed} days, ${totalRows} rows`);
      return NextResponse.json({ mode: "backfill", daysProcessed, totalRows });
    }

    // Single day mode: fetch today's rates
    const rates = await fetchRatesForDate(today);
    if (!rates) {
      return NextResponse.json({ error: "Failed to fetch rates" }, { status: 502 });
    }

    const count = await insertRates(today, rates);
    await fillGaps();
    console.log(`[exchange-rates] Synced ${count} rates for ${today}`);
    return NextResponse.json({ mode: "daily", date: today, rows: count });
  } catch (err) {
    console.error("[exchange-rates] Error:", err);
    return NextResponse.json(
      { error: "Sync failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
