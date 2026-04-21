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
