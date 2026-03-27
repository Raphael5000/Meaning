import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMicrosoftAdsData } from "@/lib/microsoft-ads-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/microsoft-ads/sync
 *
 * Cron endpoint: syncs the last 4 days for all active Microsoft Ads accounts.
 * Protected by CRON_SECRET header.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dataSources = await prisma.dataSource.findMany({
      where: {
        type: "MICROSOFT_ADS",
        status: { in: ["ACTIVE", "BACKFILLING"] },
      },
      select: {
        id: true,
        userId: true,
        propertyId: true,
        adsCustomerId: true,
      },
    });

    if (dataSources.length === 0) {
      return NextResponse.json({ message: "No active Microsoft Ads accounts to sync", synced: 0 });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 4);

    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const start = fmt(startDate);
    const end = fmt(endDate);

    const results: Array<{ accountId: string; status: string; error?: string }> = [];

    for (const ds of dataSources) {
      try {
        const result = await syncMicrosoftAdsData(
          ds.userId,
          ds.propertyId,
          ds.adsCustomerId || ds.propertyId,
          start,
          end,
        );
        results.push({ accountId: ds.propertyId, status: "ok", ...result });
      } catch (err) {
        console.error(`[msads-sync] Failed for account ${ds.propertyId}:`, err);
        results.push({
          accountId: ds.propertyId,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ synced: results.length, results });
  } catch (err) {
    console.error("[msads-sync] Error:", err);
    return NextResponse.json(
      { error: "Sync failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
