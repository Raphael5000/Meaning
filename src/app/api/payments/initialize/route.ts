import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createLsCheckout } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID?.trim();
  const baseUrl = process.env.NEXTAUTH_URL?.trim();

  if (!apiKey || !storeId || !variantId) {
    return NextResponse.json(
      { error: "LemonSqueezy not configured." },
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

    if (user.subscription?.status === "active") {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    const checkoutUrl = await createLsCheckout({
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      redirectUrl: `${baseUrl}/`,
    });

    return NextResponse.json({ checkout_url: checkoutUrl });
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
