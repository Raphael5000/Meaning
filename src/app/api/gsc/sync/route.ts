import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncGscData } from "@/lib/gsc-transfer";
import { runSyncBatch } from "@/lib/sync-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: { type: "SEARCH_CONSOLE", status: { in: ["ACTIVE", "BACKFILLING"] } },
    select: { id: true, type: true, userId: true, propertyId: true },
  });

  const result = await runSyncBatch(
    "SEARCH_CONSOLE",
    dataSources,
    (ds, start, end) => () => syncGscData(ds.userId, ds.propertyId, start, end),
  );

  return NextResponse.json(result);
}
