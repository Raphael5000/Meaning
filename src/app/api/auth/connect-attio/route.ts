import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/connect-attio
 * Validates an Attio API key and stores it in the Account table.
 * Body: { apiKey: string, workspaceId?: string }
 *
 * Each workspace gets its own Account record so multiple Attio workspaces
 * (e.g. Magix + Hivory) can coexist for the same user.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { apiKey?: string; workspaceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim() || "default";

  // Validate the key by calling a lightweight Attio endpoint
  try {
    const res = await fetch("https://api.attio.com/v2/objects", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      console.error("[connect-attio] Validation failed:", res.status);
      return NextResponse.json(
        { error: "Invalid API key. Please check your Attio API token and try again." },
        { status: 400 }
      );
    }

    // Workspace-scoped account ID so each Attio workspace gets its own key
    const attioAccountId = `attio_${userId}_${workspaceId}`;

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "attio",
          providerAccountId: attioAccountId,
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
        provider: "attio",
        providerAccountId: attioAccountId,
        access_token: apiKey,
        token_type: "Bearer",
        expires_at: Math.floor(Date.now() / 1000 + 10 * 365 * 24 * 60 * 60),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[connect-attio] Error:", err);
    return NextResponse.json({ error: "Failed to validate API key" }, { status: 500 });
  }
}
