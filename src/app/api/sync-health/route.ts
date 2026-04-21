import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync-health?orgId=...
 *
 * Returns the health status of all data sources for an org.
 * Used by the connections page to show green/yellow/red indicators.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId");

  const where = orgId
    ? { orgId, type: { not: "GA4_BIGQUERY" } }
    : { userId, type: { not: "GA4_BIGQUERY" } };

  const dataSources = await prisma.dataSource.findMany({
    where,
    select: {
      id: true,
      type: true,
      propertyId: true,
      status: true,
      lastSyncedAt: true,
      lastSyncError: true,
      updatedAt: true,
    },
    orderBy: { type: "asc" },
  });

  const now = Date.now();
  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

  const sources = dataSources.map((ds) => {
    const lastSync = ds.lastSyncedAt ?? ds.updatedAt;
    const msSinceSync = now - lastSync.getTime();
    let health: "healthy" | "stale" | "error" = "healthy";

    if (ds.status === "ERROR" || ds.lastSyncError) {
      health = "error";
    } else if (msSinceSync > TWO_DAYS) {
      health = "stale";
    }

    return {
      id: ds.id,
      type: ds.type,
      propertyId: ds.propertyId,
      status: ds.status,
      health,
      lastSyncedAt: ds.lastSyncedAt?.toISOString() ?? null,
      lastSyncError: ds.lastSyncError,
      updatedAt: ds.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ sources });
}
