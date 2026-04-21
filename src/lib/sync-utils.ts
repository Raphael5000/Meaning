import { prisma } from "@/lib/prisma";

/**
 * Sync a single DataSource with retry logic and status tracking.
 *
 * On success: sets status=ACTIVE, lastSyncedAt=now, lastSyncError=null
 * On failure: sets status=ERROR, lastSyncError=message
 *
 * Returns true if sync succeeded, false otherwise.
 */
export async function syncWithRetry(
  ds: { id: string },
  syncFn: () => Promise<unknown>,
  label: string,
  retries = 1,
): Promise<boolean> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[${label}] Retry attempt ${attempt}/${retries}`);
        // Wait 10s before retry
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

      return true;
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

  return false;
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
