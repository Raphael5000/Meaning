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

  const [user, googleAccount, hasSubscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { gaConnected: true },
    }),
    prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { id: true },
    }),
    hasActiveSubscription(userId),
  ]);

  return NextResponse.json({
    gaConnected: user?.gaConnected ?? false,
    hasGoogleAccount: !!googleAccount,
    hasSubscription,
  });
}
