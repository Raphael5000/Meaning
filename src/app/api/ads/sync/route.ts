import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAdsData } from "@/lib/ads-transfer";
import { runSyncBatch } from "@/lib/sync-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: { type: "GOOGLE_ADS", status: { in: ["ACTIVE", "BACKFILLING", "ERROR"] } },
    select: { id: true, type: true, userId: true, propertyId: true, adsCustomerId: true },
  });

  const result = await runSyncBatch(
    "GOOGLE_ADS",
    dataSources.map((ds) => ({ ...ds, propertyId: ds.adsCustomerId || ds.propertyId })),
    (ds, start, end) => () => syncAdsData(ds.userId, ds.propertyId, start, end),
  );

  return NextResponse.json(result);
}
