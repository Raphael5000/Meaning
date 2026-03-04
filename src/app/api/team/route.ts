import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/team — return the user's team (as owner or member) */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if user owns a team
  const ownedTeam = await prisma.team.findUnique({
    where: { ownerId: userId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      invites: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      },
    },
  });

  if (ownedTeam) {
    return NextResponse.json({ team: ownedTeam, role: "admin" });
  }

  // Check if user is a member of a team
  const membership = await prisma.teamMembership.findFirst({
    where: { userId },
    include: {
      team: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          memberships: {
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
          },
        },
      },
    },
  });

  if (membership) {
    return NextResponse.json({ team: membership.team, role: membership.role });
  }

  return NextResponse.json({ team: null });
}

/** POST /api/team — create a team (for subscribed users) */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if user already owns a team
  const existing = await prisma.team.findUnique({ where: { ownerId: userId } });
  if (existing) {
    return NextResponse.json({ error: "You already have a team" }, { status: 400 });
  }

  // Check subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true },
  });
  if (subscription?.status !== "active") {
    return NextResponse.json(
      { error: "Active subscription required to create a team" },
      { status: 403 }
    );
  }

  const { name } = (await request.json()) as { name?: string };
  const teamName = name?.trim() || "My Team";

  const team = await prisma.team.create({
    data: { name: teamName, ownerId: userId },
  });

  return NextResponse.json({ team }, { status: 201 });
}
