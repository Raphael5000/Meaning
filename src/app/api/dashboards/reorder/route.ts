import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** PUT /api/dashboards/reorder – update dashboard sort order */
export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as { orderedIds: string[] };
  const { orderedIds } = body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds is required" }, { status: 400 });
  }

  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.dashboard.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/dashboards/reorder] PUT error:", err);
    return NextResponse.json({ error: "Failed to reorder dashboards" }, { status: 500 });
  }
}
