import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getOrgMetric(userId: string, metricId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeOrgId: true },
  });
  return prisma.manualMetric.findFirst({
    where: { id: metricId, orgId: me?.activeOrgId ?? "" },
  });
}

/** PUT /api/manual-metrics/[id] — update name or format */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOrgMetric(userId, id);
  if (!existing) {
    return NextResponse.json({ error: "Metric not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    displayFormat?: string;
  };

  const data: Record<string, string> = {};
  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    data.name = trimmed;
  }
  if (body.displayFormat !== undefined) {
    data.displayFormat = body.displayFormat;
  }

  const metric = await prisma.manualMetric.update({
    where: { id },
    data,
    include: {
      entries: { orderBy: { period: "desc" }, take: 12 },
      kpis: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(metric);
}

/** DELETE /api/manual-metrics/[id] — delete a metric and all its entries */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOrgMetric(userId, id);
  if (!existing) {
    return NextResponse.json({ error: "Metric not found" }, { status: 404 });
  }

  // Unlink any KPIs referencing this metric before deletion
  await prisma.kpi.updateMany({
    where: { manualMetricId: id },
    data: { manualMetricId: null },
  });

  await prisma.manualMetric.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
