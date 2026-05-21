import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAhrefsApiKey } from "@/lib/ahrefs-token";
import { syncAhrefsData } from "@/lib/ahrefs-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/ahrefs/enable-export
 *
 * Creates a DataSource for an Ahrefs domain and immediately triggers
 * a backfill sync. Status goes BACKFILLING → ACTIVE (or ERROR).
 *
 * Body: { domain: string, country?: string, orgId?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const token = await getAhrefsApiKey(userId);
  if (!token) {
    return NextResponse.json(
      { error: "No Ahrefs account connected. Please add your API key first." },
      { status: 400 }
    );
  }

  let body: { domain?: string; country?: string; orgId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { domain, country, orgId } = body;

  if (!domain || typeof domain !== "string" || domain.trim().length === 0) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  const cleanDomain = domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  try {
    let resolvedOrgId = orgId;
    if (!resolvedOrgId) {
      const membership = await prisma.orgMembership.findFirst({
        where: { userId },
        select: { orgId: true },
      });
      resolvedOrgId = membership?.orgId ?? undefined;
    }

    // Upsert DataSource with BACKFILLING status
    const existingDs = await prisma.dataSource.findFirst({
      where: { userId, type: "AHREFS", propertyId: cleanDomain },
    });

    let dataSource;
    if (existingDs) {
      dataSource = await prisma.dataSource.update({
        where: { id: existingDs.id },
        data: {
          status: "BACKFILLING",
          lastSyncError: null,
          bigqueryDataset: country ? JSON.stringify({ country }) : null,
          ...(resolvedOrgId && { orgId: resolvedOrgId }),
        },
      });
    } else {
      dataSource = await prisma.dataSource.create({
        data: {
          userId,
          type: "AHREFS",
          propertyId: cleanDomain,
          status: "BACKFILLING",
          bigqueryDataset: country ? JSON.stringify({ country }) : null,
          ...(resolvedOrgId && { orgId: resolvedOrgId }),
        },
      });
    }

    // Fire-and-forget: sync Ahrefs data immediately
    syncAhrefsData(userId, cleanDomain)
      .then(async (result) => {
        console.log(`[ahrefs/enable-export] Sync complete for ${cleanDomain}:`, result);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ACTIVE", lastSyncedAt: new Date() },
        });
      })
      .catch(async (err) => {
        console.error(`[ahrefs/enable-export] Sync failed for ${cleanDomain}:`, err);
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
        }).catch(() => {});
      });

    return NextResponse.json({ success: true, domain: cleanDomain, syncing: true });
  } catch (err) {
    console.error("[ahrefs/enable-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to enable Ahrefs export" },
      { status: 500 }
    );
  }
}
