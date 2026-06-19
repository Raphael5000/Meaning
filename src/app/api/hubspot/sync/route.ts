import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncHubSpotData } from "@/lib/hubspot-transfer";
import { runSyncBatch } from "@/lib/sync-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: { type: "HUBSPOT", status: { in: ["ACTIVE", "BACKFILLING", "ERROR"] } },
    select: { id: true, type: true, userId: true, propertyId: true },
  });

  const result = await runSyncBatch(
    "HUBSPOT",
    dataSources,
    (ds) => () => syncHubSpotData(ds.userId, ds.propertyId),
  );

  return NextResponse.json(result);
}
