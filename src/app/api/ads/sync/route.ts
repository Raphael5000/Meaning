import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAdsData } from "@/lib/ads-transfer";
import { syncWithRetry, getSyncDateRange } from "@/lib/sync-utils";

export const dynamic = "force-dynamic";

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
    select: { id: true, userId: true, adsCustomerId: true },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, total: 0 });
  }

  const { start, end } = getSyncDateRange();
  let synced = 0;
  let failed = 0;

  for (const ds of dataSources) {
    if (!ds.adsCustomerId) {
      failed++;
      continue;
    }

    const ok = await syncWithRetry(
      ds,
      () => syncAdsData(ds.userId, ds.adsCustomerId!, start, end),
      `ads-sync ${ds.adsCustomerId}`,
    );
    if (ok) synced++;
    else failed++;
  }

  return NextResponse.json({ synced, failed, total: dataSources.length });
}
