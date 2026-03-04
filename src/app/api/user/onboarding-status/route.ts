import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if user is a team member — they skip subscription/GA onboarding
  const membership = await prisma.teamMembership.findFirst({
    where: { userId },
    select: { team: { select: { ownerId: true } } },
  });

  if (membership) {
    // Team members use the admin's subscription and GA connection
    const adminId = membership.team.ownerId;
    const adminSubscription = await hasActiveSubscription(adminId);

    return NextResponse.json({
      gaConnected: true, // team members use admin's GA token
      hasGoogleAccount: true,
      hasSubscription: adminSubscription,
    });
  }

  const [user, googleAccount, hasSubscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { gaConnected: true },
    }),
    prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { id: true, refresh_token: true },
    }),
    hasActiveSubscription(userId),
  ]);

  return NextResponse.json({
    gaConnected: user?.gaConnected ?? false,
    hasGoogleAccount: !!googleAccount?.refresh_token,
    hasSubscription,
  });
}
