import { prisma } from "@/lib/prisma";

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, currentPeriodEnd: true },
  });

  if (!subscription) return false;

  // Active subscription that hasn't expired
  if (
    subscription.status === "active" &&
    new Date(subscription.currentPeriodEnd) > new Date()
  ) {
    return true;
  }

  return false;
}
