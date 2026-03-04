import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      theme: true,
      createdAt: true,
      subscription: {
        select: {
          status: true,
          plan: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if user is a team member (not an admin)
  const membership = await prisma.teamMembership.findFirst({
    where: { userId: session.userId },
    select: {
      role: true,
      team: {
        select: {
          name: true,
          owner: { select: { name: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json({
    ...user,
    teamMembership: membership
      ? {
          role: membership.role,
          teamName: membership.team.name,
          adminName: membership.team.owner.name || membership.team.owner.email,
        }
      : null,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, theme } = await req.json();

    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name;
    if (theme !== undefined && ["light", "dark", "system"].includes(theme)) {
      data.theme = theme;
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data,
      select: { id: true, name: true, email: true, image: true, theme: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
