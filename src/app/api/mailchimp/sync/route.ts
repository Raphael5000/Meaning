import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMailchimpData } from "@/lib/mailchimp-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/mailchimp/sync
 *
 * Cron endpoint that syncs Mailchimp data for all active accounts.
 * Protected by CRON_SECRET in the Authorization header.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: {
      type: "MAILCHIMP",
      status: { in: ["ACTIVE", "BACKFILLING"] },
    },
    select: {
      id: true,
      userId: true,
      propertyId: true, // listId
    },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, total: 0 });
  }

  let synced = 0;
  let failed = 0;

  for (const ds of dataSources) {
    try {
      const result = await syncMailchimpData(ds.userId, ds.propertyId);
      console.log(`[mailchimp-sync-cron] Synced list ${ds.propertyId}:`, result);
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { updatedAt: new Date() },
      });
      synced++;
    } catch (err) {
      console.error(`[mailchimp-sync-cron] Failed list ${ds.propertyId}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ synced, failed, total: dataSources.length });
}
