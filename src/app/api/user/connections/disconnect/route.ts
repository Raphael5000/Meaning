import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/user/connections/disconnect
 *
 * Soft-disconnects a DataSource: sets status to DISCONNECTED and clears
 * sync error state. BigQuery data is preserved — the user can reconnect later.
 *
 * Also disconnects all DataSources of the same type for this user across
 * all orgs (e.g. disconnecting Google Ads disconnects it everywhere).
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { dataSourceId } = (await request.json()) as { dataSourceId: string };
  if (!dataSourceId) {
    return NextResponse.json({ error: "dataSourceId is required" }, { status: 400 });
  }

  // Verify ownership
  const ds = await prisma.dataSource.findUnique({
    where: { id: dataSourceId },
    select: { id: true, userId: true, type: true, propertyId: true },
  });

  if (!ds) {
    return NextResponse.json({ error: "Data source not found" }, { status: 404 });
  }

  if (ds.userId !== userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Soft-disconnect: mark as DISCONNECTED (preserves BigQuery data)
  // Also disconnect all DataSources of the same type for this user
  // so it shows as disconnected across all their orgs/teams.
  const result = await prisma.dataSource.updateMany({
    where: { userId, type: ds.type, propertyId: ds.propertyId },
    data: {
      status: "DISCONNECTED",
      lastSyncError: null,
      updatedAt: new Date(),
    },
  });

  console.log(`[disconnect] User ${userId} disconnected ${ds.type} (${ds.propertyId}), ${result.count} record(s) updated`);

  return NextResponse.json({ success: true, disconnected: result.count });
}
