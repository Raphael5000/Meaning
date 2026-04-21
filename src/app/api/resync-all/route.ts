import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAdsData } from "@/lib/ads-transfer";
import { syncGscData } from "@/lib/gsc-transfer";
import { syncLinkedInData } from "@/lib/linkedin-transfer";
import { syncMailchimpData } from "@/lib/mailchimp-transfer";
import { syncMicrosoftAdsData } from "@/lib/microsoft-ads-transfer";
import { syncWithRetry, getSyncDateRange } from "@/lib/sync-utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/resync-all
 *
 * Admin endpoint: triggers a sync for all active data sources.
 * Protected by CRON_SECRET (same as cron jobs).
 *
 * Optional query params:
 *   ?type=SEARCH_CONSOLE   — only resync one connector type
 *   ?errorsOnly=true       — only resync sources with status=ERROR
 *   ?backfill=true         — use 90-day window instead of standard 16-day
 *
 * Examples:
 *   curl -X POST https://usemeaning.io/api/resync-all -H "Authorization: Bearer $CRON_SECRET"
 *   curl -X POST "https://usemeaning.io/api/resync-all?type=SEARCH_CONSOLE&backfill=true" -H "Authorization: Bearer $CRON_SECRET"
 *   curl -X POST "https://usemeaning.io/api/resync-all?errorsOnly=true" -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl;
  const typeFilter = url.searchParams.get("type");
  const errorsOnly = url.searchParams.get("errorsOnly") === "true";
  const backfill = url.searchParams.get("backfill") === "true";

  const statusFilter = errorsOnly ? ["ERROR"] : ["ACTIVE", "BACKFILLING", "ERROR"];
  const typeCondition = typeFilter
    ? { type: typeFilter }
    : { type: { not: "GA4_BIGQUERY" } };

  const dataSources = await prisma.dataSource.findMany({
    where: { ...typeCondition, status: { in: statusFilter } },
    select: { id: true, type: true, userId: true, propertyId: true, adsCustomerId: true },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ message: "No matching data sources", synced: 0, failed: 0 });
  }

  // Date range
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  let start: string;
  let end: string;
  if (backfill) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    start = fmt(startDate);
    end = fmt(endDate);
  } else {
    const range = getSyncDateRange();
    start = range.start;
    end = range.end;
  }

  console.log(`[resync-all] Starting: ${dataSources.length} sources, type=${typeFilter || "all"}, errorsOnly=${errorsOnly}, backfill=${backfill}, range=${start}→${end}`);

  let synced = 0;
  let failed = 0;

  for (const ds of dataSources) {
    const syncFn = () => {
      switch (ds.type) {
        case "GOOGLE_ADS":
          return syncAdsData(ds.userId, ds.adsCustomerId || ds.propertyId, start, end);
        case "SEARCH_CONSOLE":
          return syncGscData(ds.userId, ds.propertyId, start, end);
        case "LINKEDIN":
          return syncLinkedInData(ds.userId, ds.propertyId, start, end);
        case "MAILCHIMP":
          return syncMailchimpData(ds.userId, ds.propertyId);
        case "MICROSOFT_ADS":
          return syncMicrosoftAdsData(ds.userId, ds.propertyId, ds.adsCustomerId || ds.propertyId, start, end);
        default:
          return Promise.resolve();
      }
    };

    const ok = await syncWithRetry(ds, syncFn, `resync-all ${ds.type} ${ds.propertyId}`);
    if (ok) synced++;
    else failed++;
  }

  console.log(`[resync-all] Done: ${synced} synced, ${failed} failed`);
  return NextResponse.json({ synced, failed, total: dataSources.length });
}
