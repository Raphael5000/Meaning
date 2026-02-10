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

  // Validate payment env so we return clear errors instead of generic 500
  const planCode = process.env.PAYSTACK_PLAN_CODE?.trim();
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  const baseUrl = process.env.NEXTAUTH_URL?.trim();
  if (!planCode) {
    return NextResponse.json(
      { error: "Payment plan not configured. Set PAYSTACK_PLAN_CODE in .env (create a plan in Paystack dashboard)." },
      { status: 500 }
    );
  }
  if (!secretKey) {
    return NextResponse.json(
      { error: "Paystack not configured. Set PAYSTACK_SECRET_KEY in .env." },
      { status: 500 }
    );
  }
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXTAUTH_URL is not set in .env." },
      { status: 500 }
    );
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

    if (!user.email?.trim()) {
      return NextResponse.json(
        { error: "Account has no email. Payment requires an email." },
        { status: 400 }
      );
    }

    // Check for active subscription
    if (user.subscription?.status === "active") {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    const callbackUrl = `${baseUrl}/api/payments/callback`;

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
    const message =
      error instanceof Error ? error.message : "Failed to initialize payment";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Failed to initialize payment"
            : message,
      },
      { status: 500 }
    );
  }
}
