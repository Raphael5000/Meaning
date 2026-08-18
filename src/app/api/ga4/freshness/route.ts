import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GA4 data reaches BigQuery through Google's native daily export, not through
 * any sync in this app, so nothing here ever observed whether it was working.
 * A broken export is silent: the link keeps reporting dailyExportEnabled and no
 * table is ever written. Two properties sat dead for 97 and 62 days that way.
 *
 * This checks the newest events_YYYYMMDD table in each analytics_{propertyId}
 * dataset and reflects it on the DataSource, so a stalled export surfaces as
 * ERROR instead of going unnoticed.
 */

// GA4's daily export normally lands 24-48h after the day it covers, so a lag of
// two days is still healthy. Alert past that.
const STALE_AFTER_DAYS = 3;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

/** Newest events_YYYYMMDD table in the dataset, or null if there are none. */
async function newestExportDate(
  bq: BigQuery,
  dataset: string
): Promise<Date | null> {
  const [exists] = await bq.dataset(dataset).exists();
  if (!exists) return null;

  const [tables] = await bq.dataset(dataset).getTables();
  const dates = tables
    .map((t) => /^events_(\d{8})$/.exec(t.id ?? "")?.[1])
    .filter((d): d is string => !!d)
    .sort();

  const newest = dates[dates.length - 1];
  if (!newest) return null;

  return new Date(
    `${newest.slice(0, 4)}-${newest.slice(4, 6)}-${newest.slice(6, 8)}T00:00:00Z`
  );
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) {
    return NextResponse.json(
      { error: "GOOGLE_BIGQUERY_CREDENTIALS not set" },
      { status: 500 }
    );
  }
  const credentials = JSON.parse(raw);
  const bq = new BigQuery({ projectId: credentials.project_id, credentials });

  const sources = await prisma.dataSource.findMany({
    where: { type: "GA4_BIGQUERY", status: { not: "DISCONNECTED" } },
    select: {
      id: true,
      propertyId: true,
      bigqueryDataset: true,
      status: true,
      lastSyncedAt: true,
    },
  });

  const now = new Date();
  const results: Array<{
    propertyId: string;
    newestExport: string | null;
    lagDays: number | null;
    status: string;
    note?: string;
  }> = [];

  for (const ds of sources) {
    const dataset = ds.bigqueryDataset || `analytics_${ds.propertyId}`;

    let newest: Date | null = null;
    try {
      newest = await newestExportDate(bq, dataset);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ga4-freshness] ${dataset} check failed: ${msg}`);
      results.push({
        propertyId: ds.propertyId,
        newestExport: null,
        lagDays: null,
        status: ds.status,
        note: `check failed: ${msg.slice(0, 120)}`,
      });
      continue;
    }

    if (!newest) {
      // No export has ever landed. Expected for 24-48h after a link is created,
      // so fall back to lastSyncedAt (a backfill stamps it) for the grace
      // window rather than alarming on a property that was just connected.
      const reference = ds.lastSyncedAt;
      const graceDays = reference ? daysBetween(now, reference) : null;

      if (graceDays === null || graceDays > STALE_AFTER_DAYS) {
        const error = `No GA4 export has reached ${dataset}. Check the property's BigQuery link has a non-empty exportStreams list and that GA4 owns the dataset.`;
        await prisma.dataSource.update({
          where: { id: ds.id },
          data: { status: "ERROR", lastSyncError: error },
        });
        results.push({
          propertyId: ds.propertyId,
          newestExport: null,
          lagDays: null,
          status: "ERROR",
          note: error,
        });
      } else {
        results.push({
          propertyId: ds.propertyId,
          newestExport: null,
          lagDays: null,
          status: ds.status,
          note: `no export yet, within grace (${graceDays}d since last activity)`,
        });
      }
      continue;
    }

    const lagDays = daysBetween(now, newest);
    const stale = lagDays > STALE_AFTER_DAYS;

    await prisma.dataSource.update({
      where: { id: ds.id },
      data: {
        // Reflect when data actually last landed, not when this job ran.
        lastSyncedAt: newest,
        status: stale ? "ERROR" : "ACTIVE",
        lastSyncError: stale
          ? `GA4 export is ${lagDays} days behind (newest table events_${newest
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, "")})`
          : null,
      },
    });

    results.push({
      propertyId: ds.propertyId,
      newestExport: newest.toISOString().slice(0, 10),
      lagDays,
      status: stale ? "ERROR" : "ACTIVE",
    });
  }

  const stale = results.filter((r) => r.status === "ERROR").length;
  console.log(
    `[ga4-freshness] Checked ${results.length} properties, ${stale} stale`
  );

  return NextResponse.json({
    checked: results.length,
    stale,
    staleAfterDays: STALE_AFTER_DAYS,
    results,
  });
}
