import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** PATCH /api/team/members/[memberId] — update a member's allowed properties */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { memberId } = await params;

  const membership = await prisma.teamMembership.findUnique({
    where: { id: memberId },
    include: { team: { select: { ownerId: true } } },
  });

  if (!membership || membership.team.ownerId !== userId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const { properties } = (await request.json()) as { properties: string[] };

  const updated = await prisma.teamMembership.update({
    where: { id: memberId },
    data: { properties },
  });

  return NextResponse.json({ membership: updated });
}

/** DELETE /api/team/members/[memberId] — remove a member from the team */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { memberId } = await params;

  const membership = await prisma.teamMembership.findUnique({
    where: { id: memberId },
    include: { team: { select: { ownerId: true } } },
  });

  if (!membership || membership.team.ownerId !== userId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await prisma.teamMembership.delete({ where: { id: memberId } });

  // Decrement seat count so next renewal charges fewer seats
  try {
    await prisma.subscription.updateMany({
      where: { userId: membership.team.ownerId, seatCount: { gt: 1 } },
      data: { seatCount: { decrement: 1 } },
    });
  } catch (err) {
    console.error("[members] Failed to decrement seat count:", err);
  }

  return NextResponse.json({ success: true });
}
