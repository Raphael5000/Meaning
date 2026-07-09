import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/dashboards?orgId=xxx – list dashboards for an org */
export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = request.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  try {
    const dashboards = await prisma.dashboard.findMany({
      where: { orgId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        dashboardType: true,
        dateRange: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { widgets: true } },
      },
    });

    return NextResponse.json(dashboards);
  } catch (err) {
    console.error("[api/dashboards] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch dashboards" }, { status: 500 });
  }
}

/** POST /api/dashboards – create a new dashboard */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as { orgId: string; title?: string; dashboardType?: string };
  const { orgId, title, dashboardType } = body;

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentYear = String(now.getFullYear());

    const dashboard = await prisma.dashboard.create({
      data: {
        orgId,
        createdBy: userId,
        title: title || "Untitled Dashboard",
        layout: [],
        ...(dashboardType === "monthly" ? { dashboardType: "monthly", dateRange: "monthly", dateFrom: currentMonth } : {}),
        ...(dashboardType === "yearly" ? { dashboardType: "yearly", dateRange: "yearly", dateFrom: currentYear } : {}),
      },
    });

    return NextResponse.json(dashboard, { status: 201 });
  } catch (err) {
    console.error("[api/dashboards] POST error:", err);
    return NextResponse.json({ error: "Failed to create dashboard" }, { status: 500 });
  }
}
