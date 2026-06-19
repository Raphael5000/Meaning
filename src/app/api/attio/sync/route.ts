import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAttioData } from "@/lib/attio-transfer";
import { runSyncBatch } from "@/lib/sync-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    where: { type: "ATTIO", status: { in: ["ACTIVE", "BACKFILLING", "ERROR"] } },
    select: { id: true, type: true, userId: true, propertyId: true },
  });

  const result = await runSyncBatch(
    "ATTIO",
    dataSources,
    (ds) => () => syncAttioData(ds.userId, ds.propertyId),
  );

  return NextResponse.json(result);
}
