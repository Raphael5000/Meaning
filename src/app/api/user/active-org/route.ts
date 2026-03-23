import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOrgMember } from "@/lib/org-access";

export const dynamic = "force-dynamic";

/** PUT /api/user/active-org — switch active organization */
export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { orgId } = (await request.json()) as { orgId: string };
  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  if (!(await isOrgMember(userId, orgId))) {
    return NextResponse.json({ error: "Not a member of this account" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeOrgId: orgId },
  });

  // Return the org details so the client can update session
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, imageUrl: true, ownerId: true },
  });

  return NextResponse.json({ activeOrg: org });
}
