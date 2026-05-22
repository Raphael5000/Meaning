import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getHubSpotApiKey } from "@/lib/hubspot-token";
import { syncHubSpotData } from "@/lib/hubspot-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/hubspot/enable-export
 * Creates a DataSource for a HubSpot account and immediately syncs.
 * Body: { hubspotId: string, orgId?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const token = await getHubSpotApiKey(userId);
  if (!token) {
    return NextResponse.json(
      { error: "No HubSpot account connected. Please add your access token first." },
      { status: 400 }
    );
  }

  let body: { hubspotId?: string; orgId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hubspotId = body.hubspotId?.trim();
  if (!hubspotId) {
    return NextResponse.json({ error: "HubSpot ID is required" }, { status: 400 });
  }

  try {
    let resolvedOrgId = body.orgId;
    if (!resolvedOrgId) {
      const membership = await prisma.orgMembership.findFirst({
        where: { userId },
        select: { orgId: true },
      });
      resolvedOrgId = membership?.orgId ?? undefined;
    }

    const existingDs = await prisma.dataSource.findFirst({
      where: { userId, type: "HUBSPOT", propertyId: hubspotId },
    });

    let dataSource;
    if (existingDs) {
      dataSource = await prisma.dataSource.update({
        where: { id: existingDs.id },
        data: {
          status: "BACKFILLING",
          lastSyncError: null,
          ...(resolvedOrgId && { orgId: resolvedOrgId }),
        },
      });
    } else {
      dataSource = await prisma.dataSource.create({
        data: {
          userId,
          type: "HUBSPOT",
          propertyId: hubspotId,
          status: "BACKFILLING",
          ...(resolvedOrgId && { orgId: resolvedOrgId }),
        },
      });
    }

    // Fire-and-forget sync
    syncHubSpotData(userId, hubspotId)
      .then(async (result) => {
        console.log(`[hubspot/enable-export] Sync complete for ${hubspotId}:`, result);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ACTIVE", lastSyncedAt: new Date() },
        });
      })
      .catch(async (err) => {
        console.error(`[hubspot/enable-export] Sync failed for ${hubspotId}:`, err);
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
        }).catch(() => {});
      });

    return NextResponse.json({ success: true, hubspotId, syncing: true });
  } catch (err) {
    console.error("[hubspot/enable-export] Error:", err);
    return NextResponse.json({ error: "Failed to enable HubSpot export" }, { status: 500 });
  }
}
