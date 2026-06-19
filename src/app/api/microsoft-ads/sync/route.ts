import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMicrosoftAdsData } from "@/lib/microsoft-ads-transfer";
import { runSyncBatch, getSyncDateRange } from "@/lib/sync-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: { type: "MICROSOFT_ADS", status: { in: ["ACTIVE", "BACKFILLING", "ERROR"] } },
    select: { id: true, type: true, userId: true, propertyId: true, adsCustomerId: true },
  });

  // Optional date range override
  const url = new URL(req.url);
  const startOverride = url.searchParams.get("startDate");
  const endOverride = url.searchParams.get("endDate");
  const dateRange = startOverride && endOverride
    ? { start: startOverride, end: endOverride }
    : getSyncDateRange();

  const result = await runSyncBatch(
    "MICROSOFT_ADS",
    dataSources,
    (ds, start, end) => () => syncMicrosoftAdsData(ds.userId, ds.propertyId, ds.adsCustomerId || ds.propertyId, start, end),
    dateRange,
  );

  return NextResponse.json(result);
}
