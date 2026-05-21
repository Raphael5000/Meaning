import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_DIRECTIONS = new Set(["above", "below"]);
const VALID_PERIODS = new Set(["daily", "weekly", "monthly"]);
const VALID_FORMATS = new Set(["number", "percentage", "currency"]);

/** PUT /api/kpis/[id] – update a KPI */
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

  const body = (await request.json()) as {
    name?: string;
    metricQuery?: string;
    targetValue?: number;
    targetDirection?: string;
    timePeriod?: string;
    displayFormat?: string;
    sortOrder?: number;
  };

  try {
    // Verify ownership via org membership
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrgId: true },
    });
    const existing = await prisma.kpi.findFirst({
      where: { id, orgId: me?.activeOrgId ?? "" },
    });
    if (!existing) {
      return NextResponse.json({ error: "KPI not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      data.name = trimmed;
    }
    if (body.metricQuery !== undefined) data.metricQuery = body.metricQuery;
    if (body.targetValue !== undefined) {
      if (typeof body.targetValue !== "number" || isNaN(body.targetValue)) {
        return NextResponse.json(
          { error: "Target value must be a number" },
          { status: 400 }
        );
      }
      data.targetValue = body.targetValue;
    }
    if (body.targetDirection !== undefined) {
      if (!VALID_DIRECTIONS.has(body.targetDirection)) {
        return NextResponse.json(
          { error: "targetDirection must be 'above' or 'below'" },
          { status: 400 }
        );
      }
      data.targetDirection = body.targetDirection;
    }
    if (body.timePeriod !== undefined) {
      if (!VALID_PERIODS.has(body.timePeriod)) {
        return NextResponse.json(
          { error: "timePeriod must be 'daily', 'weekly', or 'monthly'" },
          { status: 400 }
        );
      }
      data.timePeriod = body.timePeriod;
    }
    if (body.displayFormat !== undefined) {
      if (!VALID_FORMATS.has(body.displayFormat)) {
        return NextResponse.json(
          { error: "displayFormat must be 'number', 'percentage', or 'currency'" },
          { status: 400 }
        );
      }
      data.displayFormat = body.displayFormat;
    }
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

    const kpi = await prisma.kpi.update({
      where: { id },
      data,
    });

    return NextResponse.json(kpi);
  } catch (err) {
    console.error("[api/kpis] PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update KPI" },
      { status: 500 }
    );
  }
}

/** DELETE /api/kpis/[id] – delete a KPI */
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

  try {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrgId: true },
    });
    const existing = await prisma.kpi.findFirst({
      where: { id, orgId: me?.activeOrgId ?? "" },
    });
    if (!existing) {
      return NextResponse.json({ error: "KPI not found" }, { status: 404 });
    }

    await prisma.kpi.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/kpis] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete KPI" },
      { status: 500 }
    );
  }
}
