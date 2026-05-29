import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getOrgTemplate(userId: string, templateId: string) {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { activeOrgId: true } });
  return prisma.reportTemplate.findFirst({
    where: { id: templateId, orgId: me?.activeOrgId ?? "" },
  });
}

/** PUT /api/reports/templates/[id] — update template */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const existing = await getOrgTemplate(userId, id);
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const body = (await request.json()) as { name?: string; slides?: unknown[] };
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.slides !== undefined) data.slides = body.slides;

  const template = await prisma.reportTemplate.update({ where: { id }, data });
  return NextResponse.json(template);
}

/** DELETE /api/reports/templates/[id] — delete template */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const existing = await getOrgTemplate(userId, id);
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  await prisma.reportTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
