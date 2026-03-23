import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOrgMember, isOrgAdmin } from "@/lib/org-access";

export const dynamic = "force-dynamic";

/** GET /api/organizations/[id] — org detail + members + data sources */
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

  if (!(await isOrgMember(userId, id))) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      memberships: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      invites: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      },
      dataSources: {
        select: {
          id: true,
          type: true,
          propertyId: true,
          bigqueryDataset: true,
          adsCustomerId: true,
          ga4PropertyId: true,
          status: true,
        },
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ organization: org });
}

/** PUT /api/organizations/[id] — update name/image */
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

  if (!(await isOrgAdmin(userId, id))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { name, imageUrl } = (await request.json()) as {
    name?: string;
    imageUrl?: string;
  };

  const updated = await prisma.organization.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(imageUrl !== undefined && { imageUrl }),
    },
  });

  return NextResponse.json({ organization: updated });
}
