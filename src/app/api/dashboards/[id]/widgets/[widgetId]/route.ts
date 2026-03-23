import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** PUT /api/dashboards/:id/widgets/:widgetId – update a widget */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; widgetId: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { widgetId } = await params;
  const body = (await request.json()) as {
    title?: string;
    displayConfig?: unknown;
    cachedData?: unknown;
  };

  try {
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.displayConfig !== undefined) data.displayConfig = body.displayConfig;
    if (body.cachedData !== undefined) {
      data.cachedData = body.cachedData;
      data.cachedAt = new Date();
    }

    const widget = await prisma.widget.update({
      where: { id: widgetId },
      data,
    });

    return NextResponse.json(widget);
  } catch (err) {
    console.error("[api/widgets] PUT error:", err);
    return NextResponse.json({ error: "Failed to update widget" }, { status: 500 });
  }
}

/** DELETE /api/dashboards/:id/widgets/:widgetId – delete a widget */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; widgetId: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: dashboardId, widgetId } = await params;

  try {
    // Delete the widget
    await prisma.widget.delete({ where: { id: widgetId } });

    // Remove from dashboard layout
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      select: { layout: true },
    });

    const layout = (dashboard?.layout as Array<{ i: string }>) || [];
    const updatedLayout = layout.filter((item) => item.i !== widgetId);

    await prisma.dashboard.update({
      where: { id: dashboardId },
      data: { layout: updatedLayout },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/widgets] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete widget" }, { status: 500 });
  }
}
