import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncAdsData } from "@/lib/ads-transfer";
import { syncGscData } from "@/lib/gsc-transfer";
import { syncLinkedInData } from "@/lib/linkedin-transfer";
import { syncMailchimpData } from "@/lib/mailchimp-transfer";
import { syncMicrosoftAdsData } from "@/lib/microsoft-ads-transfer";
import { syncAhrefsData } from "@/lib/ahrefs-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/resync
 *
 * Triggers a 90-day backfill for a specific data source.
 * Body: { dataSourceId: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as { dataSourceId?: string };
  if (!body.dataSourceId) {
    return NextResponse.json({ error: "dataSourceId is required" }, { status: 400 });
  }

  const ds = await prisma.dataSource.findUnique({
    where: { id: body.dataSourceId },
    select: { id: true, type: true, userId: true, propertyId: true, adsCustomerId: true },
  });

  if (!ds) {
    return NextResponse.json({ error: "Data source not found" }, { status: 404 });
  }

  // Mark as syncing
  await prisma.dataSource.update({
    where: { id: ds.id },
    data: { status: "BACKFILLING", lastSyncError: null },
  });

  // 90-day backfill
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  const start = fmt(startDate);
  const end = fmt(endDate);

  // Fire-and-forget so the UI isn't blocked
  (async () => {
    try {
      switch (ds.type) {
        case "GOOGLE_ADS":
          await syncAdsData(ds.userId, ds.adsCustomerId || ds.propertyId, start, end);
          break;
        case "SEARCH_CONSOLE":
          await syncGscData(ds.userId, ds.propertyId, start, end);
          break;
        case "LINKEDIN":
          await syncLinkedInData(ds.userId, ds.propertyId, start, end);
          break;
        case "MAILCHIMP":
          await syncMailchimpData(ds.userId, ds.propertyId);
          break;
        case "MICROSOFT_ADS":
          await syncMicrosoftAdsData(ds.userId, ds.propertyId, ds.adsCustomerId || ds.propertyId, start, end);
          break;
        case "AHREFS":
          await syncAhrefsData(ds.userId, ds.propertyId);
          break;
        default:
          console.log(`[resync] Unsupported type: ${ds.type}`);
          return;
      }

      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { status: "ACTIVE", lastSyncedAt: new Date(), lastSyncError: null },
      });
      console.log(`[resync] Backfill complete for ${ds.type} ${ds.propertyId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[resync] Backfill failed for ${ds.type} ${ds.propertyId}:`, msg);
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
      }).catch(() => {});
    }
  })();

  return NextResponse.json({ ok: true, message: "Resync started" });
}
