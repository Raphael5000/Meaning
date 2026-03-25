import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncUrlInspection, ensureGscTables, getGscDataset } from "@/lib/gsc-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/gsc/sync-inspection
 *
 * Cron endpoint that runs URL Inspection API for all active GSC sites.
 * Inspects top URLs by impressions and stores crawl/index status.
 * Run this weekly or every few days (rate limit: 2,000 URLs/day/property).
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
      status: "ACTIVE",
    },
    select: {
      id: true,
      userId: true,
      propertyId: true,
    },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ inspected: 0, failed: 0, total: 0 });
  }

  let inspected = 0;
  let failed = 0;

  for (const ds of dataSources) {
    if (!ds.propertyId) {
      failed++;
      continue;
    }

    try {
      // Ensure the url_inspection table exists (for older datasets)
      const datasetId = getGscDataset(ds.propertyId);
      await ensureGscTables(datasetId);

      const count = await syncUrlInspection(ds.userId, ds.propertyId, 500);
      console.log(`[gsc-inspection-cron] Inspected ${count} URLs for ${ds.propertyId}`);
      inspected += count;
    } catch (err) {
      console.error(`[gsc-inspection-cron] Failed ${ds.propertyId}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ inspected, failed, total: dataSources.length });
}
