import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** DELETE /api/user/connections/disconnect — remove a DataSource record (keeps BigQuery data) */
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

  // Verify ownership — user must own this data source
  const ds = await prisma.dataSource.findUnique({
    where: { id: dataSourceId },
    select: { id: true, userId: true, orgId: true },
  });

  if (!ds) {
    return NextResponse.json({ error: "Data source not found" }, { status: 404 });
  }

  if (ds.userId !== userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Delete the DataSource record — BigQuery data is intentionally preserved
  await prisma.dataSource.delete({ where: { id: dataSourceId } });

  return NextResponse.json({ success: true });
}
