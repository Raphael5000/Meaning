import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { plan } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for active subscription
    if (user.subscription?.status === "active") {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    const planCode = process.env.PAYSTACK_PLAN_CODE;
    if (!planCode) {
      return NextResponse.json(
        { error: "Payment plan not configured" },
        { status: 500 }
      );
    }

    const callbackUrl = `${process.env.NEXTAUTH_URL}/api/payments/callback`;

    const result = await initializeTransaction({
      email: user.email,
      amount: 0, // Paystack uses the plan amount when a plan is specified
      plan: planCode,
      callback_url: callbackUrl,
      metadata: {
        userId: user.id,
        plan: plan || "monthly",
      },
    });

    // Store pending payment
    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 0, // Will be updated on verification
        currency: "ZAR",
        status: "pending",
        paystackReference: result.data.reference,
        description: `Subscription: ${plan || "monthly"}`,
      },
    });

    return NextResponse.json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
