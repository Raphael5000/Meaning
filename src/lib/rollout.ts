import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// BigQuery rollout control
// ---------------------------------------------------------------------------

/**
 * Percentage of eligible users who should use the BigQuery data path.
 * 0 = nobody (GA4 API only), 100 = everyone with an ACTIVE DataSource.
 * Change via BQ_ROLLOUT_PERCENT env var — no redeploy needed on Vercel.
 */
function getRolloutPercent(): number {
  const raw = process.env.BQ_ROLLOUT_PERCENT;
  if (!raw) return 0;
  const val = parseInt(raw, 10);
  if (isNaN(val)) return 0;
  return Math.max(0, Math.min(100, val));
}

/**
 * Deterministic hash of userId to a number 0–99.
 * Same user always gets the same bucket, so they don't flip between paths.
 */
function userBucket(userId: string): number {
  const hash = crypto.createHash("md5").update(userId).digest();
  return hash.readUInt16BE(0) % 100;
}

/**
 * Check if a user+property should use the BigQuery data path.
 *
 * Requirements:
 * 1. An ACTIVE DataSource record must exist for this user+property
 * 2. The user's bucket must be within the rollout percentage
 *
 * Returns an object with the decision and context for logging.
 */
export async function shouldUseBigQuery(
  propertyId: string,
  userId: string
): Promise<{ useBigQuery: boolean; reason: string }> {
  const percent = getRolloutPercent();
  console.log(`[rollout] checking: propertyId=${propertyId} userId=${userId} BQ_ROLLOUT_PERCENT=${process.env.BQ_ROLLOUT_PERCENT} parsed=${percent}`);

  // Check for active DataSource
  const dataSource = await prisma.dataSource.findFirst({
    where: { propertyId, userId, status: { in: ["ACTIVE", "BACKFILLING"] }, type: "GA4_BIGQUERY" },
    select: { id: true },
  });

  console.log(`[rollout] dataSource found: ${!!dataSource} ${dataSource?.id || "none"}`);

  if (!dataSource) {
    return { useBigQuery: false, reason: "no_active_datasource" };
  }

  // 100% means all eligible users
  if (percent >= 100) {
    return { useBigQuery: true, reason: "rollout_100" };
  }

  // 0% means nobody
  if (percent <= 0) {
    return { useBigQuery: false, reason: "rollout_0" };
  }

  // Check user bucket
  const bucket = userBucket(userId);
  if (bucket < percent) {
    return { useBigQuery: true, reason: `rollout_${percent}_bucket_${bucket}` };
  }

  return { useBigQuery: false, reason: `rollout_${percent}_bucket_${bucket}_excluded` };
}
