import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAdsDataset, ensureDataset, ensureAdsTables, syncAdsData } from "@/lib/ads-transfer";
import { assertCanAddSource } from "@/lib/tier";

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

  const body = (await req.json()) as { customerId: string; ga4PropertyId?: string; orgId?: string };
  const { customerId, ga4PropertyId, orgId } = body;

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

    // Resolve orgId: use provided orgId, or fall back to user's active org
    let resolvedOrgId = orgId;
    if (!resolvedOrgId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeOrgId: true } });
      resolvedOrgId = user?.activeOrgId ?? undefined;
    }

    // Free-tier source-count gate (skipped if no org — pre-launch users)
    if (resolvedOrgId) {
      const check = await assertCanAddSource(resolvedOrgId, {
        type: "GOOGLE_ADS",
        propertyId: customerId,
      });
      if (!check.ok) {
        return NextResponse.json(
          {
            error: check.reason,
            code: "FREE_TIER_SOURCE_LIMIT",
            current: check.current,
            limit: check.limit,
          },
          { status: 402 }
        );
      }
    }

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
        orgId: resolvedOrgId || undefined,
        status: "BACKFILLING",
      },
      create: {
        userId,
        teamId: teamMembership?.teamId ?? undefined,
        orgId: resolvedOrgId || undefined,
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
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
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
