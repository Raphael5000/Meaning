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

/** GET /api/manual-metrics/[id]/entries — list entries */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const metric = await getOrgMetric(userId, id);
  if (!metric) {
    return NextResponse.json({ error: "Metric not found" }, { status: 404 });
  }

  const entries = await prisma.manualMetricEntry.findMany({
    where: { metricId: id },
    orderBy: { period: "desc" },
  });

  return NextResponse.json(entries);
}

/** POST /api/manual-metrics/[id]/entries — upsert an entry for a period */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const metric = await getOrgMetric(userId, id);
  if (!metric) {
    return NextResponse.json({ error: "Metric not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    period: string;
    value: number;
    note?: string;
  };

  if (!body.period || !/^\d{4}-\d{2}$/.test(body.period)) {
    return NextResponse.json(
      { error: "Period must be YYYY-MM format" },
      { status: 400 }
    );
  }
  if (typeof body.value !== "number" || isNaN(body.value)) {
    return NextResponse.json(
      { error: "Value must be a number" },
      { status: 400 }
    );
  }

  const entry = await prisma.manualMetricEntry.upsert({
    where: { metricId_period: { metricId: id, period: body.period } },
    create: {
      metricId: id,
      period: body.period,
      value: body.value,
      note: body.note?.trim() || null,
    },
    update: {
      value: body.value,
      note: body.note?.trim() || null,
    },
  });

  // Update cachedValue on any KPIs linked to this metric
  const latestEntry = await prisma.manualMetricEntry.findFirst({
    where: { metricId: id },
    orderBy: { period: "desc" },
  });
  if (latestEntry) {
    await prisma.kpi.updateMany({
      where: { manualMetricId: id },
      data: { cachedValue: latestEntry.value, cachedAt: new Date() },
    });
  }

  return NextResponse.json(entry, { status: 201 });
}

/** DELETE /api/manual-metrics/[id]/entries?period=2026-05 — delete an entry */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const metric = await getOrgMetric(userId, id);
  if (!metric) {
    return NextResponse.json({ error: "Metric not found" }, { status: 404 });
  }

  const period = request.nextUrl.searchParams.get("period");
  if (!period) {
    return NextResponse.json({ error: "period param required" }, { status: 400 });
  }

  await prisma.manualMetricEntry.deleteMany({
    where: { metricId: id, period },
  });

  // Recompute linked KPI cached values
  const latestEntry = await prisma.manualMetricEntry.findFirst({
    where: { metricId: id },
    orderBy: { period: "desc" },
  });
  await prisma.kpi.updateMany({
    where: { manualMetricId: id },
    data: {
      cachedValue: latestEntry?.value ?? null,
      cachedAt: latestEntry ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true });
}
