import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/dashboards/:id – get a dashboard with all widgets */
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

  try {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id },
      include: { widgets: true },
    });

    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    return NextResponse.json(dashboard);
  } catch (err) {
    console.error("[api/dashboards/:id] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}

/** PUT /api/dashboards/:id – update dashboard (title, layout, dateRange) */
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
    title?: string;
    layout?: unknown[];
    dateRange?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
  };

  try {
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.layout !== undefined) data.layout = body.layout;
    if (body.dateRange !== undefined) data.dateRange = body.dateRange;
    if (body.dateFrom !== undefined) data.dateFrom = body.dateFrom;
    if (body.dateTo !== undefined) data.dateTo = body.dateTo;

    const dashboard = await prisma.dashboard.update({
      where: { id },
      data,
    });

    return NextResponse.json(dashboard);
  } catch (err) {
    console.error("[api/dashboards/:id] PUT error:", err);
    return NextResponse.json({ error: "Failed to update dashboard" }, { status: 500 });
  }
}

/** DELETE /api/dashboards/:id – delete a dashboard and its widgets */
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
    await prisma.dashboard.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/dashboards/:id] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete dashboard" }, { status: 500 });
  }
}
