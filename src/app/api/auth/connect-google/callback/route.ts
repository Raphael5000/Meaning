import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Handles the Google OAuth callback after the user consents.
 * Exchanges the authorization code for tokens and stores them
 * in the Account table linked to the current user.
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
    return NextResponse.redirect(
      new URL("/connect-analytics?error=oauth_denied", baseUrl)
    );
  }

  // Verify state to prevent CSRF
  const cookieStore = await cookies();
  const storedState = cookieStore.get("ga_connect_state")?.value;
  cookieStore.delete("ga_connect_state");

  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL("/connect-analytics?error=invalid_state", baseUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/connect-analytics?error=no_code", baseUrl)
    );
  }

  try {
    // Exchange authorization code for tokens.
    // Use an AbortController timeout + one retry to match the resilience
    // of the NextAuth token exchange (which uses fetchWithTimeout in auth.ts).
    const tokenBody = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${baseUrl}/api/auth/connect-google/callback`,
      grant_type: "authorization_code",
    });

    let tokenRes: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);
      try {
        tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenBody,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        break; // success — stop retrying
      } catch (fetchErr) {
        clearTimeout(timeout);
        if (attempt === 1) throw fetchErr; // second attempt failed
        console.warn("[connect-google] Token fetch attempt 1 failed, retrying…", fetchErr);
      }
    }

    const tokens = await tokenRes!.json();

    if (!tokenRes!.ok) {
      console.error("[connect-google] Token exchange failed:", tokens);
      return NextResponse.redirect(
        new URL("/connect-analytics?error=token_failed", baseUrl)
      );
    }

    // Decode id_token to get the Google account ID
    const idTokenParts = (tokens.id_token as string).split(".");
    const idTokenPayload = JSON.parse(
      Buffer.from(idTokenParts[1], "base64url").toString()
    );
    const googleUserId = idTokenPayload.sub as string;

    // Create or update the Account record linked to this user
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: googleUserId,
        },
      },
      update: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? undefined,
        expires_at: tokens.expires_in
          ? Math.floor(Date.now() / 1000 + tokens.expires_in)
          : undefined,
        token_type: tokens.token_type,
        scope: tokens.scope,
        id_token: tokens.id_token,
      },
      create: {
        userId,
        type: "oauth",
        provider: "google",
        providerAccountId: googleUserId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in
          ? Math.floor(Date.now() / 1000 + tokens.expires_in)
          : undefined,
        token_type: tokens.token_type,
        scope: tokens.scope,
        id_token: tokens.id_token,
      },
    });

    return NextResponse.redirect(
      new URL("/connect-analytics?connected=true", baseUrl)
    );
  } catch (err) {
    console.error("[connect-google] Error:", err);
    return NextResponse.redirect(
      new URL("/connect-analytics?error=unknown", baseUrl)
    );
  }
}
