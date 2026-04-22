import { BigQuery } from "@google-cloud/bigquery";

/**
 * Run a BigQuery DELETE, gracefully handling streaming buffer errors.
 *
 * Returns true if the DELETE succeeded, false if it was skipped due to
 * streaming buffer. Callers should check the return value and skip the
 * subsequent INSERT if false — otherwise duplicates will accumulate.
 */
export async function safeDelete(bq: BigQuery, query: string, label = "bq"): Promise<boolean> {
  try {
    await bq.query({ query });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("streaming buffer") || msg.includes("UPDATE or DELETE")) {
      console.log(`[${label}] Skipping DELETE (streaming buffer) — will NOT insert to avoid duplicates`);
      return false;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// SQL value formatting
// ---------------------------------------------------------------------------

/**
 * Format a JS value as a BigQuery SQL literal for use in MERGE statements.
 */
function formatBqValue(val: unknown, type: string): string {
  if (val === null || val === undefined) return "NULL";
  switch (type) {
    case "DATE":
      return `DATE '${val}'`;
    case "TIMESTAMP":
      return `TIMESTAMP '${val}'`;
    case "STRING": {
      const escaped = String(val).replace(/'/g, "''");
      return `'${escaped}'`;
    }
    case "INT64":
      return String(Math.round(Number(val)));
    case "FLOAT64":
      return String(Number(val));
    default:
      return `'${String(val).replace(/'/g, "''")}'`;
  }
}

// ---------------------------------------------------------------------------
// MERGE (idempotent upsert — no streaming buffer, no duplicates)
// ---------------------------------------------------------------------------

/**
 * MERGE rows into a BigQuery table using DML (no streaming buffer).
 *
 * This replaces the old DELETE + streaming INSERT pattern which was vulnerable
 * to duplicate data when concurrent syncs (cron + manual resync) overlapped.
 *
 * MERGE is idempotent — running it twice with the same data produces the same
 * result. Duplicate rows are impossible because MERGE checks keys before inserting.
 *
 * @param bq        BigQuery client
 * @param fqTable   Fully-qualified table (backtick-wrapped): `\`project.dataset.table\``
 * @param rows      Array of row objects to merge
 * @param keyColumns Columns that form the natural key (for ON clause)
 * @param schema    Table schema with column names and types
 * @param label     Logging label
 */
export async function mergeRows(
  bq: BigQuery,
  fqTable: string,
  rows: Record<string, unknown>[],
  keyColumns: string[],
  schema: Array<{ name: string; type: string }>,
  label = "bq",
): Promise<void> {
  if (rows.length === 0) return;

  const allColumns = schema.map((f) => f.name);
  const typeMap = Object.fromEntries(schema.map((f) => [f.name, f.type]));
  const BATCH_SIZE = 500;

  // Deduplicate rows by key columns (prevents MERGE failure on duplicate source keys)
  const seen = new Set<string>();
  const uniqueRows = rows.filter((row) => {
    const key = keyColumns.map((k) => String(row[k] ?? "NULL")).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (uniqueRows.length < rows.length) {
    console.log(`[${label}] Deduplicated ${rows.length - uniqueRows.length} rows in source data`);
  }

  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const batch = uniqueRows.slice(i, i + BATCH_SIZE);

    // Build source as SELECT ... UNION ALL SELECT ...
    const selectParts = batch.map((row) => {
      const cols = allColumns.map(
        (col) => `${formatBqValue(row[col], typeMap[col])} AS ${col}`,
      );
      return `SELECT ${cols.join(", ")}`;
    });

    const source = selectParts.join("\nUNION ALL\n");
    const onClause = keyColumns.map((k) => `T.${k} = S.${k}`).join(" AND ");
    const nonKeyColumns = allColumns.filter((c) => !keyColumns.includes(c));

    let matchedClause = "";
    if (nonKeyColumns.length > 0) {
      const updateSet = nonKeyColumns.map((c) => `${c} = S.${c}`).join(", ");
      matchedClause = `WHEN MATCHED THEN UPDATE SET ${updateSet}`;
    }

    const insertCols = allColumns.join(", ");
    const insertVals = allColumns.map((c) => `S.${c}`).join(", ");

    const sql = `MERGE ${fqTable} T
USING (${source}) S
ON ${onClause}
${matchedClause}
WHEN NOT MATCHED THEN INSERT (${insertCols}) VALUES (${insertVals})`;

    await bq.query({ query: sql });

    if (uniqueRows.length > BATCH_SIZE) {
      console.log(
        `[${label}] Merged batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueRows.length / BATCH_SIZE)} (${batch.length} rows)`,
      );
    }
  }

  console.log(`[${label}] Merged ${uniqueRows.length} rows into ${fqTable}`);
}

// ---------------------------------------------------------------------------
// Deduplication (cleanup for existing duplicate data)
// ---------------------------------------------------------------------------

/**
 * Remove duplicate rows from a BigQuery table.
 * Uses CREATE OR REPLACE TABLE to rebuild with only unique rows (by key columns).
 * Preserves table partitioning.
 *
 * @returns Number of duplicate rows removed
 */
export async function deduplicateTable(
  bq: BigQuery,
  fqTable: string,
  keyColumns: string[],
  partitionColumn?: string,
  label = "bq",
): Promise<number> {
  // Count duplicates
  const keyList = keyColumns.join(", ");
  const [countResult] = await bq.query({
    query: `SELECT COUNT(*) AS total,
       (SELECT COUNT(*) FROM (SELECT DISTINCT ${keyList} FROM ${fqTable})) AS unique_keys
FROM ${fqTable}`,
  });
  const total = Number(countResult[0]?.total ?? 0);
  const unique = Number(countResult[0]?.unique_keys ?? 0);
  const dupes = total - unique;

  if (dupes === 0) {
    console.log(`[${label}] No duplicates in ${fqTable} (${total} rows)`);
    return 0;
  }

  console.log(`[${label}] Found ${dupes} duplicates in ${fqTable} (${total} total, ${unique} unique)`);

  // Rebuild table without duplicates, preserving partitioning
  const partitionClause = partitionColumn ? `\nPARTITION BY ${partitionColumn}` : "";

  await bq.query({
    query: `CREATE OR REPLACE TABLE ${fqTable}${partitionClause}
AS
SELECT * EXCEPT(_rn) FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY ${keyList}) AS _rn
  FROM ${fqTable}
) WHERE _rn = 1`,
  });

  console.log(`[${label}] Removed ${dupes} duplicates from ${fqTable}`);
  return dupes;
}
