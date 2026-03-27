import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/auth/connect-microsoft-ads/callback
 *
 * Handles the Azure AD OAuth callback for Microsoft Ads.
 * Exchanges the authorization code for tokens and stores them
 * as a separate Account record with provider="microsoft-ads".
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
    console.error("[connect-microsoft-ads] OAuth error:", error, searchParams.get("error_description"));
    return NextResponse.redirect(
      new URL("/?error=ms_ads_oauth_denied", baseUrl)
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("ms_ads_state")?.value;
  cookieStore.delete("ms_ads_state");

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
    const tokenBody = new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_ADS_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_ADS_CLIENT_SECRET!,
      redirect_uri: `${baseUrl}/api/auth/connect-microsoft-ads/callback`,
      grant_type: "authorization_code",
      scope: "https://ads.microsoft.com/msads.manage offline_access",
    });

    const tokenRes = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody.toString(),
      }
    );

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error("[connect-microsoft-ads] Token exchange failed:", errorBody);
      return NextResponse.redirect(
        new URL("/?error=ms_ads_token_failed", baseUrl)
      );
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };

    // Use a stable identifier: the userId in our system as the providerAccountId
    // since Azure AD tokens don't include an id_token with `sub` by default
    // for the msads.manage scope. We key by our userId to keep it simple.
    const providerAccountId = userId;

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "microsoft-ads",
          providerAccountId,
        },
      },
      update: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? undefined,
        expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
        token_type: tokens.token_type,
        scope: tokens.scope,
      },
      create: {
        userId,
        type: "oauth",
        provider: "microsoft-ads",
        providerAccountId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? undefined,
        expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
        token_type: tokens.token_type,
        scope: tokens.scope,
      },
    });

    return NextResponse.redirect(
      new URL("/?ms_ads_connected=true", baseUrl)
    );
  } catch (err) {
    console.error("[connect-microsoft-ads] Error:", err);
    return NextResponse.redirect(
      new URL("/?error=unknown", baseUrl)
    );
  }
}
