import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLsSubscription } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

/** GET /api/user/billing-portal — get LemonSqueezy customer portal URL */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { lsSubscriptionId: true },
    });

    if (!subscription?.lsSubscriptionId) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const lsSub = await getLsSubscription(subscription.lsSubscriptionId);
    const portalUrl = lsSub.attributes.urls.customer_portal;

    if (!portalUrl) {
      return NextResponse.json({ error: "Portal URL not available" }, { status: 404 });
    }

    return NextResponse.json({ url: portalUrl });
  } catch (err) {
    console.error("[billing-portal] Error:", err);
    return NextResponse.json({ error: "Failed to get billing portal" }, { status: 500 });
  }
}
