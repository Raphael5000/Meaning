import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncLinkedInData } from "@/lib/linkedin-transfer";
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
      type: "LINKEDIN",
      status: { in: ["ACTIVE", "BACKFILLING"] },
    },
    select: { id: true, userId: true, propertyId: true },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, total: 0 });
  }

  const { start, end } = getSyncDateRange();
  let synced = 0;
  let failed = 0;

  for (const ds of dataSources) {
    const ok = await syncWithRetry(
      ds,
      () => syncLinkedInData(ds.userId, ds.propertyId, start, end),
      `linkedin-sync ${ds.propertyId}`,
    );
    if (ok) synced++;
    else failed++;
  }

  return NextResponse.json({ synced, failed, total: dataSources.length });
}
