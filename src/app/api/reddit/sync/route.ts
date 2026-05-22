import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncRedditData } from "@/lib/reddit-transfer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: { type: "REDDIT", status: { in: ["ACTIVE", "BACKFILLING"] } },
    select: { id: true, type: true, userId: true, propertyId: true, orgId: true },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, message: "No REDDIT sources" });
  }

  let synced = 0;
  let failed = 0;

  for (const ds of dataSources) {
    try {
      const orgId = ds.orgId ?? ds.userId;
      console.log(`[reddit/sync] Syncing r/${ds.propertyId} for org ${orgId}`);
      await syncRedditData(ds.propertyId, orgId);
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { status: "ACTIVE", lastSyncedAt: new Date(), lastSyncError: null },
      });
      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[reddit/sync] Failed r/${ds.propertyId}:`, msg);
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
      }).catch(() => {});
      failed++;
    }
  }

  console.log(`[reddit/sync] Done: ${synced} synced, ${failed} failed`);
  return NextResponse.json({ synced, failed });
}
