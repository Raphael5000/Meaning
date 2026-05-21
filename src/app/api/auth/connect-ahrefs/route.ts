import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/connect-ahrefs
 *
 * Validates an Ahrefs API key and stores it in the Account table.
 * Body: { apiKey: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  // Validate the key by calling a lightweight Ahrefs endpoint
  try {
    const res = await fetch(
      "https://api.ahrefs.com/v3/subscription-info/limits-and-usage",
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[connect-ahrefs] Validation failed:", res.status, errorText);
      return NextResponse.json(
        { error: "Invalid API key. Please check your Ahrefs API token and try again." },
        { status: 400 }
      );
    }

    const subData = (await res.json()) as {
      subscription_id?: string;
      user_id?: string;
    };

    const ahrefsAccountId =
      subData.subscription_id || subData.user_id || `ahrefs_${userId}`;

    // Store as an Account record (same shape as OAuth accounts)
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "ahrefs",
          providerAccountId: ahrefsAccountId,
        },
      },
      update: {
        userId,
        access_token: apiKey,
        token_type: "Bearer",
        // API keys don't expire like OAuth tokens — set far-future expiry
        expires_at: Math.floor(Date.now() / 1000 + 10 * 365 * 24 * 60 * 60),
      },
      create: {
        userId,
        type: "oauth",
        provider: "ahrefs",
        providerAccountId: ahrefsAccountId,
        access_token: apiKey,
        token_type: "Bearer",
        expires_at: Math.floor(Date.now() / 1000 + 10 * 365 * 24 * 60 * 60),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[connect-ahrefs] Error:", err);
    return NextResponse.json(
      { error: "Failed to validate API key" },
      { status: 500 }
    );
  }
}
