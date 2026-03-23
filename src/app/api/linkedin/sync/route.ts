import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncLinkedInData } from "@/lib/linkedin-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/linkedin/sync
 *
 * Cron endpoint that syncs LinkedIn data for all active accounts.
 * Protected by CRON_SECRET in the Authorization header.
 * Syncs the last 4 days for each account.
 */
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
    select: {
      id: true,
      userId: true,
      propertyId: true, // orgId
    },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, total: 0 });
  }

  // Sync last 4 days for each account (covers gaps from missed syncs/deploys)
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
    try {
      const result = await syncLinkedInData(ds.userId, ds.propertyId, start, end);
      console.log(`[linkedin-sync-cron] Synced org ${ds.propertyId}:`, result);
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { updatedAt: new Date() },
      });
      synced++;
    } catch (err) {
      console.error(`[linkedin-sync-cron] Failed org ${ds.propertyId}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ synced, failed, total: dataSources.length });
}
