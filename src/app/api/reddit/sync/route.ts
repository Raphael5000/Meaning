import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncRedditData } from "@/lib/reddit-transfer";
import { syncWithRetry } from "@/lib/sync-utils";
import { sendSyncFailureEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: { type: "REDDIT", status: { in: ["ACTIVE", "BACKFILLING", "ERROR"] } },
    select: { id: true, type: true, userId: true, propertyId: true, orgId: true },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, total: 0, message: "No REDDIT sources" });
  }

  let synced = 0;
  let failed = 0;
  const errors: Array<{ propertyId: string; error: string }> = [];

  for (const ds of dataSources) {
    const orgId = ds.orgId ?? ds.userId;
    const result = await syncWithRetry(
      ds,
      () => syncRedditData(ds.propertyId, orgId),
      `reddit-sync r/${ds.propertyId}`,
    );
    if (result.success) {
      synced++;
    } else {
      failed++;
      errors.push({ propertyId: ds.propertyId, error: result.error || "Unknown error" });
    }
  }

  if (failed > 0) {
    await sendSyncFailureEmail({
      connectorType: "REDDIT",
      failedCount: failed,
      totalCount: dataSources.length,
      errors,
    }).catch((err) => {
      console.error(`[sync-batch] Failed to send alert email:`, err);
    });
  }

  return NextResponse.json({ synced, failed, total: dataSources.length });
}
