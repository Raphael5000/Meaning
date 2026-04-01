import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") || "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventName: string = event.meta?.event_name;
  const userId: string | undefined = event.meta?.custom_data?.user_id;
  const attrs = event.data?.attributes;

  try {
    switch (eventName) {
      case "subscription_created":
        await handleSubscriptionCreated(userId, attrs, event.data.id);
        break;

      case "subscription_updated":
        await handleSubscriptionUpdated(attrs, event.data.id);
        break;

      case "subscription_payment_success":
        await handlePaymentSuccess(attrs, event.data.id);
        break;

      case "subscription_payment_failed":
        await handlePaymentFailed(event.data.id);
        break;

      case "subscription_cancelled":
        await handleSubscriptionCancelled(event.data.id);
        break;

      case "subscription_expired":
        await handleSubscriptionExpired(event.data.id);
        break;

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ received: true });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCreated(userId: string | undefined, attrs: any, lsSubId: string) {
  if (!userId) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  // Store LS customer ID on user
  const customerId = String(attrs.customer_id);
  await prisma.user.update({
    where: { id: userId },
    data: { lsCustomerId: customerId },
  });

  const now = new Date();
  const periodEnd = attrs.renews_at ? new Date(attrs.renews_at) : new Date(now.getTime() + 30 * 86_400_000);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status: mapLsStatus(attrs.status),
      plan: "monthly",
      lsSubscriptionId: String(lsSubId),
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      status: mapLsStatus(attrs.status),
      lsSubscriptionId: String(lsSubId),
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdated(attrs: any, lsSubId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { lsSubscriptionId: String(lsSubId) },
  });
  if (!subscription) return;

  const periodEnd = attrs.renews_at ? new Date(attrs.renews_at) : subscription.currentPeriodEnd;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: mapLsStatus(attrs.status),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: attrs.cancelled || false,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentSuccess(attrs: any, lsSubId: string) {
  // attrs here is the subscription_invoice attributes
  const subscription = await prisma.subscription.findFirst({
    where: { lsSubscriptionId: String(attrs.subscription_id || lsSubId) },
  });
  if (!subscription) return;

  // Record payment
  const ref = `ls_${lsSubId}_${Date.now()}`;
  await prisma.payment.create({
    data: {
      userId: subscription.userId,
      amount: attrs.total || attrs.subtotal || 0,
      currency: attrs.currency || "USD",
      status: "success",
      reference: ref,
      lsOrderId: String(attrs.order_id || lsSubId),
      description: "Subscription",
    },
  });

  // Extend subscription period
  const periodEnd = attrs.renews_at
    ? new Date(attrs.renews_at)
    : new Date(Date.now() + 30 * 86_400_000);

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    },
  });
}

async function handlePaymentFailed(lsSubId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { lsSubscriptionId: String(lsSubId) },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "past_due" },
  });
}

async function handleSubscriptionCancelled(lsSubId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { lsSubscriptionId: String(lsSubId) },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
  });
}

async function handleSubscriptionExpired(lsSubId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { lsSubscriptionId: String(lsSubId) },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "cancelled" },
  });
}

function mapLsStatus(lsStatus: string): string {
  switch (lsStatus) {
    case "active":
      return "active";
    case "on_trial":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "paused":
    case "cancelled":
    case "expired":
      return "cancelled";
    default:
      return "active";
  }
}
