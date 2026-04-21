import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMicrosoftAdsData } from "@/lib/microsoft-ads-transfer";
import { syncWithRetry, getSyncDateRange } from "@/lib/sync-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: {
      type: "MICROSOFT_ADS",
      status: { in: ["ACTIVE", "BACKFILLING"] },
    },
    select: { id: true, userId: true, propertyId: true, adsCustomerId: true },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, total: 0 });
  }

  // Optional date range override for manual catch-up syncs
  const url = new URL(req.url);
  const startOverride = url.searchParams.get("startDate");
  const endOverride = url.searchParams.get("endDate");

  let start: string;
  let end: string;
  if (startOverride && endOverride) {
    start = startOverride;
    end = endOverride;
  } else {
    const range = getSyncDateRange();
    start = range.start;
    end = range.end;
  }
  console.log(`[msads-sync] Date range: ${start} → ${end}`);

  let synced = 0;
  let failed = 0;

  for (const ds of dataSources) {
    const ok = await syncWithRetry(
      ds,
      () => syncMicrosoftAdsData(ds.userId, ds.propertyId, ds.adsCustomerId || ds.propertyId, start, end),
      `msads-sync ${ds.propertyId}`,
    );
    if (ok) synced++;
    else failed++;
  }

  return NextResponse.json({ synced, failed, total: dataSources.length });
}
