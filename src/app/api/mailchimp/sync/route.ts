import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMailchimpData } from "@/lib/mailchimp-transfer";
import { syncWithRetry } from "@/lib/sync-utils";

export const dynamic = "force-dynamic";

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
    select: { id: true, type: true, userId: true, propertyId: true },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, total: 0 });
  }

  let synced = 0;
  let failed = 0;

  for (const ds of dataSources) {
    const ok = await syncWithRetry(
      ds,
      () => syncMailchimpData(ds.userId, ds.propertyId),
      `mailchimp-sync ${ds.propertyId}`,
    );
    if (ok) synced++;
    else failed++;
  }

  return NextResponse.json({ synced, failed, total: dataSources.length });
}
