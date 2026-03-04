import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

/**
 * Called by the client after embedded checkout onSuccess.
 * Verifies the transaction and activates subscription so connect-analytics loads correctly.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reference } = await req.json().catch(() => ({}));
  if (!reference || typeof reference !== "string") {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  try {
    const result = await verifyTransaction(reference);
    const txData = result.data;

    const payment = await prisma.payment.findUnique({
      where: { paystackReference: reference },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.payment.update({
      where: { paystackReference: reference },
      data: {
        status: txData.status === "success" ? "success" : "failed",
        amount: txData.amount,
        currency: txData.currency,
        paystackTransactionId: String(txData.id),
      },
    });

    if (txData.status === "success") {
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          paystackCustomerCode: txData.customer.customer_code,
          paystackAuthorizationCode: txData.authorization.authorization_code,
        },
      });

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await prisma.subscription.upsert({
        where: { userId: payment.userId },
        create: {
          userId: payment.userId,
          status: "active",
          plan: "monthly",
          seatCount: 1,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        update: {
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Verify-complete error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
