import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAdsDataset, ensureDataset, ensureAdsTables, syncAdsData } from "@/lib/ads-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/ads/enable-export
 *
 * Creates BigQuery dataset + tables and triggers a 90-day backfill.
 * Body: { customerId: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as { customerId: string; ga4PropertyId?: string };
  const { customerId, ga4PropertyId } = body;

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  try {
    const datasetId = getAdsDataset(customerId);
    await ensureDataset(datasetId);
    await ensureAdsTables(datasetId);

    const teamMembership = await prisma.teamMembership.findFirst({
      where: { userId },
      select: { teamId: true },
    });

    const dataSource = await prisma.dataSource.upsert({
      where: {
        userId_propertyId_type: {
          userId,
          propertyId: customerId,
          type: "GOOGLE_ADS",
        },
      },
      update: {
        bigqueryDataset: datasetId,
        adsCustomerId: customerId,
        ga4PropertyId: ga4PropertyId || undefined,
        status: "BACKFILLING",
      },
      create: {
        userId,
        teamId: teamMembership?.teamId ?? undefined,
        type: "GOOGLE_ADS",
        propertyId: customerId,
        bigqueryDataset: datasetId,
        adsCustomerId: customerId,
        ga4PropertyId: ga4PropertyId || undefined,
        status: "BACKFILLING",
      },
    });

    // Fire-and-forget: 90-day backfill
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const fmt = (d: Date) => d.toISOString().split("T")[0];

    syncAdsData(userId, customerId, fmt(startDate), fmt(endDate))
      .then(async (result) => {
        console.log(`[enable-ads-export] Backfill complete for ${customerId}:`, result);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ACTIVE" },
        });
      })
      .catch(async (err) => {
        console.error(`[enable-ads-export] Backfill failed for ${customerId}:`, err);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ERROR" },
        }).catch(() => {});
      });

    return NextResponse.json({ dataSource, syncing: true });
  } catch (err) {
    console.error("[enable-ads-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to enable", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
