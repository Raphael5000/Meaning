import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGscDataset, ensureDataset, ensureGscTables, syncGscData } from "@/lib/gsc-transfer";
import { assertCanAddSource } from "@/lib/tier";

export const dynamic = "force-dynamic";

/**
 * POST /api/gsc/enable-export
 *
 * Creates BigQuery dataset + tables and triggers a 90-day backfill.
 * Body: { siteUrl: string, ga4PropertyId?: string, orgId?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as { siteUrl: string; ga4PropertyId?: string; orgId?: string };
  const { siteUrl, ga4PropertyId, orgId } = body;

  if (!siteUrl) {
    return NextResponse.json({ error: "siteUrl is required" }, { status: 400 });
  }

  try {
    const datasetId = getGscDataset(siteUrl);
    await ensureDataset(datasetId);
    await ensureGscTables(datasetId);

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
        type: "SEARCH_CONSOLE",
        propertyId: siteUrl,
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
          propertyId: siteUrl,
          type: "SEARCH_CONSOLE",
        },
      },
      update: {
        bigqueryDataset: datasetId,
        ga4PropertyId: ga4PropertyId || undefined,
        orgId: resolvedOrgId || undefined,
        status: "BACKFILLING",
      },
      create: {
        userId,
        teamId: teamMembership?.teamId ?? undefined,
        orgId: resolvedOrgId || undefined,
        type: "SEARCH_CONSOLE",
        propertyId: siteUrl,
        bigqueryDataset: datasetId,
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

    syncGscData(userId, siteUrl, fmt(startDate), fmt(endDate))
      .then(async (result) => {
        console.log(`[enable-gsc-export] Backfill complete for ${siteUrl}:`, result);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ACTIVE" },
        });
      })
      .catch(async (err) => {
        console.error(`[enable-gsc-export] Backfill failed for ${siteUrl}:`, err);
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
        }).catch(() => {});
      });

    return NextResponse.json({ dataSource, syncing: true });
  } catch (err) {
    console.error("[enable-gsc-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to enable", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
