import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOrgAdmin } from "@/lib/org-access";

export const dynamic = "force-dynamic";

/** DELETE /api/organizations/[id]/members/[memberId] — remove a member */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: orgId, memberId } = await params;

  if (!(await isOrgAdmin(userId, orgId))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const membership = await prisma.orgMembership.findUnique({
    where: { id: memberId },
  });

  if (!membership || membership.orgId !== orgId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Don't allow removing the owner
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });
  if (membership.userId === org?.ownerId) {
    return NextResponse.json(
      { error: "Cannot remove the account owner" },
      { status: 400 }
    );
  }

  await prisma.orgMembership.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
