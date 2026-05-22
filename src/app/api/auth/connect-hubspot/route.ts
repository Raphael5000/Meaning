import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/connect-hubspot
 * Validates a HubSpot Private App access token and stores it in the Account table.
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
    return NextResponse.json({ error: "Access token is required" }, { status: 400 });
  }

  // Validate the key by calling a lightweight HubSpot endpoint
  try {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      console.error("[connect-hubspot] Validation failed:", res.status);
      return NextResponse.json(
        { error: "Invalid access token. Please check your HubSpot Private App token and try again." },
        { status: 400 }
      );
    }

    const hubspotAccountId = `hubspot_${userId}`;

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "hubspot",
          providerAccountId: hubspotAccountId,
        },
      },
      update: {
        userId,
        access_token: apiKey,
        token_type: "Bearer",
        expires_at: Math.floor(Date.now() / 1000 + 10 * 365 * 24 * 60 * 60),
      },
      create: {
        userId,
        type: "oauth",
        provider: "hubspot",
        providerAccountId: hubspotAccountId,
        access_token: apiKey,
        token_type: "Bearer",
        expires_at: Math.floor(Date.now() / 1000 + 10 * 365 * 24 * 60 * 60),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[connect-hubspot] Error:", err);
    return NextResponse.json({ error: "Failed to validate access token" }, { status: 500 });
  }
}
