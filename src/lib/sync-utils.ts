import { prisma } from "@/lib/prisma";
import { sendSyncFailureEmail } from "@/lib/resend";

interface SyncResult {
  success: boolean;
  error?: string;
  propertyId?: string;
}

/**
 * Sync a single DataSource with retry logic, status tracking, and sync logging.
 *
 * On success: sets status=ACTIVE, lastSyncedAt=now, lastSyncError=null, logs success
 * On failure: sets status=ERROR, lastSyncError=message, logs failure
 */
export async function syncWithRetry(
  ds: { id: string; type?: string; propertyId?: string },
  syncFn: () => Promise<unknown>,
  label: string,
  retries = 1,
): Promise<SyncResult> {
  let lastError: Error | null = null;
  const connectorType = ds.type || label.split(" ")[0].toUpperCase();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[${label}] Retry attempt ${attempt}/${retries}`);
        await new Promise((r) => setTimeout(r, 10_000));
      }

      const result = await syncFn();
      console.log(`[${label}] Sync OK:`, result);

      // Mark healthy
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: {
          status: "ACTIVE",
          lastSyncedAt: new Date(),
          lastSyncError: null,
          updatedAt: new Date(),
        },
      });

      // Log success
      await prisma.syncLog.upsert({
        where: { id: `${ds.id}_${today.toISOString().split("T")[0]}` },
        create: {
          id: `${ds.id}_${today.toISOString().split("T")[0]}`,
          dataSourceId: ds.id,
          connectorType,
          date: today,
          success: true,
          error: null,
        },
        update: { success: true, error: null },
      }).catch(() => {});

      return { success: true, propertyId: ds.propertyId };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[${label}] Attempt ${attempt + 1} failed:`, lastError.message);
    }
  }

  // All attempts exhausted — mark as error
  const errorMsg = lastError?.message?.slice(0, 500) || "Unknown sync error";
  await prisma.dataSource.update({
    where: { id: ds.id },
    data: {
      status: "ERROR",
      lastSyncError: errorMsg,
      updatedAt: new Date(),
    },
  }).catch(() => {});

  // Log failure
  await prisma.syncLog.upsert({
    where: { id: `${ds.id}_${today.toISOString().split("T")[0]}` },
    create: {
      id: `${ds.id}_${today.toISOString().split("T")[0]}`,
      dataSourceId: ds.id,
      connectorType,
      date: today,
      success: false,
      error: errorMsg,
    },
    update: { success: false, error: errorMsg },
  }).catch(() => {});

  return { success: false, error: errorMsg, propertyId: ds.propertyId };
}

/**
 * Run a batch of syncs for a connector type, with failure email notification.
 *
 * This is the standard entry point for all sync cron routes. It:
 * 1. Iterates over data sources
 * 2. Calls syncWithRetry for each
 * 3. Sends an admin email if any failed
 * 4. Returns { synced, failed, total }
 */
export async function runSyncBatch(
  connectorType: string,
  dataSources: Array<{ id: string; type: string; userId: string; propertyId: string; adsCustomerId?: string | null }>,
  buildSyncFn: (ds: typeof dataSources[0], start: string, end: string) => () => Promise<unknown>,
  dateRange?: { start: string; end: string },
): Promise<{ synced: number; failed: number; total: number }> {
  if (dataSources.length === 0) {
    return { synced: 0, failed: 0, total: 0 };
  }

  const { start, end } = dateRange ?? getSyncDateRange();
  let synced = 0;
  let failed = 0;
  const errors: Array<{ propertyId: string; error: string }> = [];

  for (const ds of dataSources) {
    const result = await syncWithRetry(
      ds,
      buildSyncFn(ds, start, end),
      `${connectorType.toLowerCase()}-sync ${ds.propertyId}`,
    );
    if (result.success) {
      synced++;
    } else {
      failed++;
      errors.push({ propertyId: ds.propertyId, error: result.error || "Unknown error" });
    }
  }

  // Send failure notification email
  if (failed > 0) {
    await sendSyncFailureEmail({
      connectorType,
      failedCount: failed,
      totalCount: dataSources.length,
      errors,
    }).catch((err) => {
      console.error(`[sync-batch] Failed to send alert email:`, err);
    });
  }

  return { synced, failed, total: dataSources.length };
}

/**
 * Standard date range for daily cron syncs.
 * Uses 16-day window to survive 2 weeks of failures.
 */
export function getSyncDateRange(): { start: string; end: string } {
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 16);
  return { start: fmt(startDate), end: fmt(endDate) };
}
