import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/reports/templates — list all templates for the org */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { activeOrgId: true } });
  if (!me?.activeOrgId) return NextResponse.json([]);

  const templates = await prisma.reportTemplate.findMany({
    where: { orgId: me.activeOrgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

/** POST /api/reports/templates — create a new template */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { activeOrgId: true } });
  if (!me?.activeOrgId) return NextResponse.json({ error: "No active organization" }, { status: 400 });

  const body = (await request.json()) as { name: string; slides: unknown[] };
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const template = await prisma.reportTemplate.create({
    data: {
      orgId: me.activeOrgId,
      name: body.name.trim(),
      slides: (body.slides || []) as object[],
    },
  });

  return NextResponse.json(template, { status: 201 });
}
