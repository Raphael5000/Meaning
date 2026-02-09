import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  try {
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(event.data);
        break;

      case "subscription.create":
        await handleSubscriptionCreate(event.data);
        break;

      case "subscription.not_renew":
        await handleSubscriptionNotRenew(event.data);
        break;

      case "subscription.disable":
        await handleSubscriptionDisable(event.data);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data);
        break;

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ received: true });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChargeSuccess(data: any) {
  const customerCode = data.customer?.customer_code;
  if (!customerCode) return;

  const user = await prisma.user.findFirst({
    where: { paystackCustomerCode: customerCode },
  });
  if (!user) return;

  // Record the payment
  const existing = await prisma.payment.findUnique({
    where: { paystackReference: data.reference },
  });

  if (!existing) {
    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: data.amount,
        currency: data.currency,
        status: "success",
        paystackReference: data.reference,
        paystackTransactionId: String(data.id),
        description: "Subscription renewal",
      },
    });
  }

  // Extend subscription period
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      status: "active",
      plan: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCreate(data: any) {
  const customerCode = data.customer?.customer_code;
  if (!customerCode) return;

  const user = await prisma.user.findFirst({
    where: { paystackCustomerCode: customerCode },
  });
  if (!user) return;

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      paystackSubscriptionCode: data.subscription_code,
      paystackEmailToken: data.email_token,
      status: "active",
    },
    create: {
      userId: user.id,
      status: "active",
      plan: "monthly",
      paystackSubscriptionCode: data.subscription_code,
      paystackEmailToken: data.email_token,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(data.next_payment_date),
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionNotRenew(data: any) {
  const customerCode = data.customer?.customer_code;
  if (!customerCode) return;

  const user = await prisma.user.findFirst({
    where: { paystackCustomerCode: customerCode },
  });
  if (!user) return;

  await prisma.subscription.update({
    where: { userId: user.id },
    data: { cancelAtPeriodEnd: true },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDisable(data: any) {
  const customerCode = data.customer?.customer_code;
  if (!customerCode) return;

  const user = await prisma.user.findFirst({
    where: { paystackCustomerCode: customerCode },
  });
  if (!user) return;

  await prisma.subscription.update({
    where: { userId: user.id },
    data: { status: "cancelled" },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentFailed(data: any) {
  const customerCode = data.customer?.customer_code;
  if (!customerCode) return;

  const user = await prisma.user.findFirst({
    where: { paystackCustomerCode: customerCode },
  });
  if (!user) return;

  await prisma.subscription.update({
    where: { userId: user.id },
    data: { status: "past_due" },
  });
}
