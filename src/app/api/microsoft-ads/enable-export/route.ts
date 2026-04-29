import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMsAdsDataset, ensureDataset, ensureMsAdsTables, resetMsAdsTables, syncMicrosoftAdsData } from "@/lib/microsoft-ads-transfer";
import { assertCanAddSource } from "@/lib/tier";

export const dynamic = "force-dynamic";

/**
 * POST /api/microsoft-ads/enable-export
 *
 * Creates BigQuery dataset + tables and triggers a 90-day backfill.
 * Body: { accountId: string, customerId?: string, orgId?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as { accountId: string; customerId?: string; orgId?: string };
  const { accountId, customerId, orgId } = body;

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  try {
    const datasetId = getMsAdsDataset(accountId);
    await ensureDataset(datasetId);
    // Drop and recreate tables to clear old data (handles resync)
    await resetMsAdsTables(datasetId);

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
        type: "MICROSOFT_ADS",
        propertyId: accountId,
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
          propertyId: accountId,
          type: "MICROSOFT_ADS",
        },
      },
      update: {
        bigqueryDataset: datasetId,
        adsCustomerId: customerId || accountId,
        orgId: resolvedOrgId || undefined,
        status: "BACKFILLING",
      },
      create: {
        userId,
        teamId: teamMembership?.teamId ?? undefined,
        orgId: resolvedOrgId || undefined,
        type: "MICROSOFT_ADS",
        propertyId: accountId,
        bigqueryDataset: datasetId,
        adsCustomerId: customerId || accountId,
        status: "BACKFILLING",
      },
    });

    // Fire-and-forget: 90-day backfill
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const fmt = (d: Date) => d.toISOString().split("T")[0];

    syncMicrosoftAdsData(userId, accountId, customerId || accountId, fmt(startDate), fmt(endDate))
      .then(async (result) => {
        console.log(`[enable-msads-export] Backfill complete for ${accountId}:`, result);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ACTIVE" },
        });
      })
      .catch(async (err) => {
        console.error(`[enable-msads-export] Backfill failed for ${accountId}:`, err);
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
        }).catch(() => {});
      });

    return NextResponse.json({ dataSource, syncing: true });
  } catch (err) {
    console.error("[enable-msads-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to enable", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
