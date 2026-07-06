import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAttioApiKey } from "@/lib/attio-token";
import { syncAttioData } from "@/lib/attio-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/attio/enable-export
 * Creates a DataSource for an Attio workspace and immediately syncs.
 * Body: { workspaceId: string, orgId?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { workspaceId?: string; orgId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
  }

  const token = await getAttioApiKey(userId, workspaceId);
  if (!token) {
    return NextResponse.json(
      { error: "No Attio account connected. Please add your API key first." },
      { status: 400 }
    );
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
      where: { userId, type: "ATTIO", propertyId: workspaceId },
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
          type: "ATTIO",
          propertyId: workspaceId,
          status: "BACKFILLING",
          ...(resolvedOrgId && { orgId: resolvedOrgId }),
        },
      });
    }

    // Fire-and-forget sync
    syncAttioData(userId, workspaceId)
      .then(async (result) => {
        console.log(`[attio/enable-export] Sync complete for ${workspaceId}:`, result);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ACTIVE", lastSyncedAt: new Date() },
        });
      })
      .catch(async (err) => {
        console.error(`[attio/enable-export] Sync failed for ${workspaceId}:`, err);
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
        }).catch(() => {});
      });

    return NextResponse.json({ success: true, workspaceId, syncing: true });
  } catch (err) {
    console.error("[attio/enable-export] Error:", err);
    return NextResponse.json({ error: "Failed to enable Attio export" }, { status: 500 });
  }
}
