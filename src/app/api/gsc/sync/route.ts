import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncGscData } from "@/lib/gsc-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/gsc/sync
 *
 * Cron endpoint that syncs Google Search Console data for all active sites.
 * Protected by CRON_SECRET in the Authorization header.
 * Syncs the last 4 days for each site (covers gaps from missed syncs).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: {
      type: "SEARCH_CONSOLE",
      status: { in: ["ACTIVE", "BACKFILLING"] },
    },
    select: {
      id: true,
      userId: true,
      propertyId: true,
    },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, total: 0 });
  }

  // Sync last 4 days for each site (covers gaps from missed syncs/deploys)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 4);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const start = fmt(startDate);
  const end = fmt(endDate);

  let synced = 0;
  let failed = 0;

  for (const ds of dataSources) {
    if (!ds.propertyId) {
      failed++;
      continue;
    }

    try {
      const result = await syncGscData(ds.userId, ds.propertyId, start, end);
      console.log(`[gsc-sync-cron] Synced ${ds.propertyId}:`, result);
      // Touch updatedAt so we can monitor last successful sync
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { updatedAt: new Date() },
      });
      synced++;
    } catch (err) {
      console.error(`[gsc-sync-cron] Failed ${ds.propertyId}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ synced, failed, total: dataSources.length });
}
