import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAdsData } from "@/lib/ads-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/ads/sync
 *
 * Cron endpoint that syncs Google Ads data for all active accounts.
 * Protected by CRON_SECRET in the Authorization header.
 * Syncs the last 2 days (yesterday + day before) for each account.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: {
      type: "GOOGLE_ADS",
      status: { in: ["ACTIVE", "BACKFILLING"] },
    },
    select: {
      id: true,
      userId: true,
      adsCustomerId: true,
    },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, total: 0 });
  }

  // Sync last 2 days for each account
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 2);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const start = fmt(startDate);
  const end = fmt(endDate);

  let synced = 0;
  let failed = 0;

  for (const ds of dataSources) {
    if (!ds.adsCustomerId) {
      failed++;
      continue;
    }

    try {
      const result = await syncAdsData(ds.userId, ds.adsCustomerId, start, end);
      console.log(`[ads-sync-cron] Synced ${ds.adsCustomerId}:`, result);
      synced++;
    } catch (err) {
      console.error(`[ads-sync-cron] Failed ${ds.adsCustomerId}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ synced, failed, total: dataSources.length });
}
