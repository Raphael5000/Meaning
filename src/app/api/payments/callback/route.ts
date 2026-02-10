import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  const trxref = req.nextUrl.searchParams.get("trxref");
  const ref = reference || trxref;
  const baseUrl = process.env.NEXTAUTH_URL || req.url;

  if (!ref) {
    return NextResponse.redirect(new URL("/pricing?error=no_reference", baseUrl));
  }

  try {
    const result = await verifyTransaction(ref);
    const txData = result.data;

    // Update the payment record
    const payment = await prisma.payment.findUnique({
      where: { paystackReference: ref },
    });

    if (!payment) {
      return NextResponse.redirect(
        new URL("/pricing?error=payment_not_found", baseUrl)
      );
    }

    await prisma.payment.update({
      where: { paystackReference: ref },
      data: {
        status: txData.status === "success" ? "success" : "failed",
        amount: txData.amount,
        currency: txData.currency,
        paystackTransactionId: String(txData.id),
      },
    });

    if (txData.status === "success") {
      // Update customer code on user
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          paystackCustomerCode: txData.customer.customer_code,
        },
      });

      // Create or update subscription
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await prisma.subscription.upsert({
        where: { userId: payment.userId },
        create: {
          userId: payment.userId,
          status: "active",
          plan: "monthly",
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

      return NextResponse.redirect(
        new URL("/connect-analytics?payment=success", baseUrl)
      );
    }

    return NextResponse.redirect(new URL("/pricing?error=payment_failed", baseUrl));
  } catch (error) {
    console.error("Payment callback error:", error);
    return NextResponse.redirect(
      new URL("/pricing?error=verification_failed", baseUrl)
    );
  }
}
