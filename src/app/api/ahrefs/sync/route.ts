import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAhrefsData } from "@/lib/ahrefs-transfer";
import { getAhrefsApiKey } from "@/lib/ahrefs-token";
import { getAhrefsQuota, AHREFS_STOP_PCT } from "@/lib/ahrefs-usage";
import { runSyncBatch } from "@/lib/sync-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: { type: "AHREFS", status: { in: ["ACTIVE", "BACKFILLING", "ERROR"] } },
    select: { id: true, type: true, userId: true, propertyId: true },
  });

  const result = await runSyncBatch(
    "AHREFS",
    dataSources,
    (ds) => () => syncAhrefsData(ds.userId, ds.propertyId),
  );

  // Report the workspace's unit position alongside the sync result so the cron
  // log shows where we stand against the monthly cap. Free — costs 0 units.
  let quota = null;
  const firstUserId = dataSources[0]?.userId;
  if (firstUserId) {
    const apiKey = await getAhrefsApiKey(firstUserId);
    if (apiKey) {
      const q = await getAhrefsQuota(apiKey, { force: true });
      if (q) {
        quota = {
          used: q.used,
          limit: q.limit,
          pct: Number(q.pct.toFixed(1)),
          remaining: q.remaining,
          resetDate: q.resetDate,
          stopThresholdPct: AHREFS_STOP_PCT,
        };
        console.log(
          `[ahrefs-sync] Workspace units: ${q.used.toLocaleString()}/${q.limit.toLocaleString()} ` +
            `(${q.pct.toFixed(1)}%), resets ${q.resetDate ?? "unknown"}`,
        );
      }
    }
  }

  return NextResponse.json({ ...result, quota });
}
