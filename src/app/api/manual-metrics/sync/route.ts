import { NextRequest, NextResponse } from "next/server";
import { syncManualMetricsToBigQuery } from "@/lib/manual-metrics-bq";

export const dynamic = "force-dynamic";

/**
 * POST /api/manual-metrics/sync — mirror every manual entry into BigQuery.
 * Runs on every save (see queueManualMetricsSync) and daily from server.js as
 * a backstop, in case a save-time sync failed.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entries = await syncManualMetricsToBigQuery();
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[manual-metrics] sync failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
