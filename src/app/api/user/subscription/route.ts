import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cancelLsSubscription } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.userId },
  });

  return NextResponse.json({ subscription });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.userId },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "No active subscription" },
      { status: 404 }
    );
  }

  try {
    // Cancel on LemonSqueezy (enters grace period until ends_at)
    if (subscription.lsSubscriptionId) {
      await cancelLsSubscription(subscription.lsSubscriptionId);
    }

    // Mark as cancelling at period end
    await prisma.subscription.update({
      where: { userId: session.userId },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    return NextResponse.json({ message: "Subscription will cancel at period end" });
  } catch (error) {
    console.error("Subscription cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
