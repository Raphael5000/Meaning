import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";
import {
  getOrgTier,
  getOrgMessageUsage,
  getOrgSourceCount,
  FREE_TIER_SOURCE_LIMIT,
} from "@/lib/tier";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  const activeOrgId = (session as { activeOrgId?: string })?.activeOrgId;

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
      // Team members inherit the admin's tier; team usage is reported on the
      // admin's org. The dashboard typically loads org-scoped usage separately.
      tier: adminSubscription ? "paid" : "free",
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

  // Resolve active org for tier/usage. Falls back to first owned org if the
  // session's activeOrgId is stale.
  let orgId = activeOrgId;
  if (!orgId) {
    const owned = await prisma.organization.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    orgId = owned?.id;
  }

  let tier: "free" | "paid" = hasSubscription ? "paid" : "free";
  let messageUsage: Awaited<ReturnType<typeof getOrgMessageUsage>> | null = null;
  let sourceCount = 0;
  const sourceLimit = FREE_TIER_SOURCE_LIMIT;

  if (orgId) {
    [tier, messageUsage, sourceCount] = await Promise.all([
      getOrgTier(orgId),
      getOrgMessageUsage(orgId),
      getOrgSourceCount(orgId),
    ]);
  }

  return NextResponse.json({
    gaConnected: user?.gaConnected ?? false,
    hasGoogleAccount: !!googleAccount?.refresh_token,
    hasSubscription,
    tier,
    sourceCount,
    sourceLimit,
    messageUsage, // null if no org yet
  });
}
