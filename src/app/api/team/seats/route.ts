import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/team/seats — return current seat usage */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const team = await prisma.team.findUnique({
    where: { ownerId: userId },
    include: {
      memberships: true,
      invites: { where: { acceptedAt: null, expiresAt: { gt: new Date() } } },
    },
  });

  const activeMembers = team?.memberships.length ?? 0;
  const pendingInvites = team?.invites.length ?? 0;

  return NextResponse.json({
    total: activeMembers + pendingInvites + 1, // +1 for admin
    activeMembers,
    pendingInvites,
  });
}
