import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOrgAdmin } from "@/lib/org-access";

export const dynamic = "force-dynamic";

/** POST /api/organizations/[id]/invite — invite a member */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: orgId } = await params;

  if (!(await isOrgAdmin(userId, orgId))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { email } = (await request.json()) as { email: string };
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check for existing active invite
  const existingInvite = await prisma.orgInvite.findUnique({
    where: { orgId_email: { orgId, email: normalizedEmail } },
  });
  if (
    existingInvite &&
    !existingInvite.acceptedAt &&
    existingInvite.expiresAt > new Date()
  ) {
    return NextResponse.json(
      { error: "An active invite already exists for this email" },
      { status: 400 }
    );
  }

  // Check if already a member
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existingUser) {
    const existingMembership = await prisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId, userId: existingUser.id } },
    });
    if (existingMembership) {
      return NextResponse.json(
        { error: "This user is already a member" },
        { status: 400 }
      );
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.orgInvite.upsert({
    where: { orgId_email: { orgId, email: normalizedEmail } },
    create: {
      orgId,
      email: normalizedEmail,
      expiresAt,
    },
    update: {
      expiresAt,
      acceptedAt: null,
    },
  });

  return NextResponse.json({ invite }, { status: 201 });
}
