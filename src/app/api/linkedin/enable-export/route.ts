import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getLinkedInDataset,
  ensureDataset,
  ensureLinkedInTables,
  syncLinkedInData,
} from "@/lib/linkedin-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/linkedin/enable-export
 *
 * Creates BigQuery dataset + tables and triggers a 12-month backfill
 * for a LinkedIn organization.
 * Body: { orgId: string, ga4PropertyId?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as { orgId: string; ga4PropertyId?: string; organizationOrgId?: string };
  const { orgId, ga4PropertyId, organizationOrgId } = body;

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  try {
    const datasetId = getLinkedInDataset(orgId);
    await ensureDataset(datasetId);
    await ensureLinkedInTables(datasetId);

    const teamMembership = await prisma.teamMembership.findFirst({
      where: { userId },
      select: { teamId: true },
    });

    // Resolve org: use provided organizationOrgId, or fall back to user's active org
    let resolvedOrgId = organizationOrgId;
    if (!resolvedOrgId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeOrgId: true } });
      resolvedOrgId = user?.activeOrgId ?? undefined;
    }

    const dataSource = await prisma.dataSource.upsert({
      where: {
        userId_propertyId_type: {
          userId,
          propertyId: orgId,
          type: "LINKEDIN",
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
        type: "LINKEDIN",
        propertyId: orgId,
        bigqueryDataset: datasetId,
        ga4PropertyId: ga4PropertyId || undefined,
        status: "BACKFILLING",
      },
    });

    // Fire-and-forget: 12-month backfill (LinkedIn's max window)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const fmt = (d: Date) => d.toISOString().split("T")[0];

    syncLinkedInData(userId, orgId, fmt(startDate), fmt(endDate))
      .then(async (result) => {
        console.log(`[enable-linkedin-export] Backfill complete for org ${orgId}:`, result);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ACTIVE" },
        });
      })
      .catch(async (err) => {
        console.error(`[enable-linkedin-export] Backfill failed for org ${orgId}:`, err);
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
        }).catch(() => {});
      });

    return NextResponse.json({ dataSource, syncing: true });
  } catch (err) {
    console.error("[enable-linkedin-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to enable", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
