import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncHubSpotData } from "@/lib/hubspot-transfer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: { type: "HUBSPOT", status: { in: ["ACTIVE", "BACKFILLING"] } },
    select: { id: true, type: true, userId: true, propertyId: true },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, message: "No HUBSPOT sources" });
  }

  let synced = 0;
  let failed = 0;

  for (const ds of dataSources) {
    try {
      console.log(`[hubspot/sync] Syncing ${ds.propertyId} for user ${ds.userId}`);
      await syncHubSpotData(ds.userId, ds.propertyId);
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { status: "ACTIVE", lastSyncedAt: new Date(), lastSyncError: null },
      });
      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[hubspot/sync] Failed ${ds.propertyId}:`, msg);
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
      }).catch(() => {});
      failed++;
    }
  }

  console.log(`[hubspot/sync] Done: ${synced} synced, ${failed} failed`);
  return NextResponse.json({ synced, failed });
}
