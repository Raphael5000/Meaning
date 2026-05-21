import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { refreshOrgKpis } from "@/lib/kpi-executor";

export const dynamic = "force-dynamic";

/** POST /api/kpis/refresh — refresh all KPI cached values for the user's active org */
export async function POST() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeOrgId: true },
  });
  const orgId = me?.activeOrgId;
  if (!orgId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 });
  }

  try {
    const results = await refreshOrgKpis(orgId);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[api/kpis/refresh] Error:", err);
    return NextResponse.json({ error: "Failed to refresh KPIs" }, { status: 500 });
  }
}
