import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** POST /api/dashboards/[id]/widgets/simple — create a heading or divider widget (no AI) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: dashboardId } = await params;
  const body = (await request.json()) as {
    widgetType: "heading" | "divider";
    title?: string;
  };

  if (body.widgetType !== "heading" && body.widgetType !== "divider") {
    return NextResponse.json({ error: "widgetType must be heading or divider" }, { status: 400 });
  }

  const dashboard = await prisma.dashboard.findFirst({
    where: { id: dashboardId },
    select: { id: true, orgId: true, layout: true },
  });
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  const title = body.title || (body.widgetType === "heading" ? "Section Title" : "");

  const widget = await prisma.widget.create({
    data: {
      dashboard: { connect: { id: dashboardId } },
      prompt: "",
      widgetType: body.widgetType,
      queryConfig: {},
      displayConfig: { text: title },
      title,
    },
  });

  // Add to layout
  const rawLayout = (dashboard.layout as Array<{ i: string; x: number; y: number; w: number; h: number }>) || [];
  const maxBottom = rawLayout.reduce((m, it) => Math.max(m, it.y + it.h), 0);
  const size = body.widgetType === "heading" ? { w: 12, h: 1 } : { w: 12, h: 1 };
  const newLayout = [...rawLayout, { i: widget.id, x: 0, y: maxBottom, ...size }];

  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { layout: newLayout },
  });

  return NextResponse.json({ widget, layout: newLayout }, { status: 201 });
}
