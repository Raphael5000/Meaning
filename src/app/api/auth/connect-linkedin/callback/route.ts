import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/connect-linkedin/callback
 *
 * Handles the LinkedIn OAuth callback. Exchanges the authorization code
 * for access + refresh tokens, then stores them in the Account table
 * with provider "linkedin".
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("[connect-linkedin] OAuth denied:", error, searchParams.get("error_description"));
    return NextResponse.redirect(
      new URL("/?error=linkedin_oauth_denied", baseUrl)
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("linkedin_state")?.value;
  cookieStore.delete("linkedin_state");

  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL("/?error=invalid_state", baseUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=no_code", baseUrl)
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirect_uri: `${baseUrl}/api/auth/connect-linkedin/callback`,
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error("[connect-linkedin] Token exchange failed:", tokenRes.status, errorBody);
      return NextResponse.redirect(
        new URL("/?error=linkedin_token_failed", baseUrl)
      );
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      scope: string;
    };

    // Get the LinkedIn member ID (sub) from the userinfo endpoint
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let linkedinUserId = "unknown";
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as { sub?: string };
      linkedinUserId = profile.sub ?? "unknown";
    }

    // Store the LinkedIn account in the Account table
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "linkedin",
          providerAccountId: linkedinUserId,
        },
      },
      update: {
        access_token: tokens.access_token,
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
        token_type: "Bearer",
        scope: tokens.scope,
      },
      create: {
        userId,
        type: "oauth",
        provider: "linkedin",
        providerAccountId: linkedinUserId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
        token_type: "Bearer",
        scope: tokens.scope,
      },
    });

    // Reactivate DataSources that were DISCONNECTED by a provider reset
    const reactivated = await prisma.dataSource.updateMany({
      where: { userId, type: "LINKEDIN", status: "DISCONNECTED" },
      data: { status: "ACTIVE", updatedAt: new Date() },
    });
    if (reactivated.count > 0) {
      console.log(`[connect-linkedin] Reactivated ${reactivated.count} DataSource(s) after reconnect`);
    }

    return NextResponse.redirect(
      new URL("/?linkedin_connected=true", baseUrl)
    );
  } catch (err) {
    console.error("[connect-linkedin] Error:", err);
    return NextResponse.redirect(
      new URL("/?error=linkedin_unknown", baseUrl)
    );
  }
}
