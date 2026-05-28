import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_FORMATS = new Set(["number", "percentage", "currency"]);

/** GET /api/manual-metrics — list all manual metrics for the user's active org */
export async function GET() {
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
  if (!orgId) return NextResponse.json([]);

  const metrics = await prisma.manualMetric.findMany({
    where: { orgId },
    include: {
      entries: { orderBy: { period: "desc" }, take: 12 },
      kpis: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(metrics);
}

/** POST /api/manual-metrics — create a new manual metric */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name: string;
    displayFormat?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const displayFormat = body.displayFormat || "number";
  if (!VALID_FORMATS.has(displayFormat)) {
    return NextResponse.json(
      { error: "displayFormat must be 'number', 'percentage', or 'currency'" },
      { status: 400 }
    );
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeOrgId: true },
  });
  const orgId = me?.activeOrgId;
  if (!orgId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 });
  }

  const metric = await prisma.manualMetric.create({
    data: {
      orgId,
      name: body.name.trim(),
      displayFormat,
    },
    include: {
      entries: true,
      kpis: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(metric, { status: 201 });
}
