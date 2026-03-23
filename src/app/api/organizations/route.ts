import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrgs } from "@/lib/org-access";

export const dynamic = "force-dynamic";

/** GET /api/organizations — list user's organizations */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgs = await getUserOrgs(userId);
  return NextResponse.json({ organizations: orgs });
}

/** POST /api/organizations — create a new organization */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if user already owns an org
  const existing = await prisma.organization.findUnique({
    where: { ownerId: userId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already own an account" },
      { status: 400 }
    );
  }

  const { name, imageUrl } = (await request.json()) as {
    name?: string;
    imageUrl?: string;
  };
  const orgName = name?.trim() || "My Account";

  const org = await prisma.$transaction(async (tx) => {
    const newOrg = await tx.organization.create({
      data: {
        name: orgName,
        imageUrl: imageUrl || null,
        ownerId: userId,
      },
    });

    // Create admin membership for the owner
    await tx.orgMembership.create({
      data: {
        orgId: newOrg.id,
        userId,
        role: "admin",
      },
    });

    // Set as active org
    await tx.user.update({
      where: { id: userId },
      data: { activeOrgId: newOrg.id },
    });

    return newOrg;
  });

  return NextResponse.json({ organization: org }, { status: 201 });
}
