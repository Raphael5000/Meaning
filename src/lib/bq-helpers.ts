import { BigQuery } from "@google-cloud/bigquery";

/**
 * Run a BigQuery DELETE, gracefully handling streaming buffer errors.
 *
 * BigQuery refuses to DELETE rows that are still in the streaming buffer
 * (~30 minutes after insert). When this happens we log and continue —
 * the subsequent INSERT will add fresh rows and the next sync's DELETE
 * will clean up the duplicates once the buffer has drained.
 */
export async function safeDelete(bq: BigQuery, query: string, label = "bq"): Promise<void> {
  try {
    await bq.query({ query });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("streaming buffer") || msg.includes("UPDATE or DELETE")) {
      console.log(`[${label}] Skipping DELETE (streaming buffer), fresh data will overwrite`);
    } else {
      throw err;
    }
  }
}
