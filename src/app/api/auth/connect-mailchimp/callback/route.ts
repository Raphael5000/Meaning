import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/connect-mailchimp/callback
 *
 * Handles the Mailchimp OAuth callback. Exchanges the authorization code
 * for an access token, then calls the metadata endpoint to get the data
 * center prefix. Stores token + dc in the Account table.
 *
 * Mailchimp tokens never expire — no refresh token is returned.
 * The dc is stored in session_state for later API calls.
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
    console.error("[connect-mailchimp] OAuth denied:", error);
    return NextResponse.redirect(
      new URL("/?error=mailchimp_oauth_denied", baseUrl)
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("mailchimp_state")?.value;
  cookieStore.delete("mailchimp_state");

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
    // Exchange authorization code for access token
    const tokenRes = await fetch("https://login.mailchimp.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.MAILCHIMP_CLIENT_ID!,
        client_secret: process.env.MAILCHIMP_CLIENT_SECRET!,
        redirect_uri: (process.env.MAILCHIMP_REDIRECT_URI || `${baseUrl}/api/auth/connect-mailchimp/callback`),
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error("[connect-mailchimp] Token exchange failed:", tokenRes.status, errorBody);
      return NextResponse.redirect(
        new URL("/?error=mailchimp_token_failed", baseUrl)
      );
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
    };

    // Get the data center and account info from the metadata endpoint
    const metaRes = await fetch("https://login.mailchimp.com/oauth2/metadata", {
      headers: { Authorization: `OAuth ${tokens.access_token}` },
    });

    if (!metaRes.ok) {
      const metaErr = await metaRes.text();
      console.error("[connect-mailchimp] Metadata fetch failed:", metaRes.status, metaErr);
      return NextResponse.redirect(
        new URL("/?error=mailchimp_metadata_failed", baseUrl)
      );
    }

    const meta = (await metaRes.json()) as {
      dc: string;
      accountname: string;
      user_id: number;
      login: { email: string; login_id: number };
      api_endpoint: string;
    };

    // Store the Mailchimp account. Use session_state to store the dc prefix.
    const mailchimpUserId = String(meta.user_id);

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "mailchimp",
          providerAccountId: mailchimpUserId,
        },
      },
      update: {
        access_token: tokens.access_token,
        token_type: "Bearer",
        session_state: meta.dc, // Store data center prefix
        scope: meta.api_endpoint, // Store full API endpoint for convenience
      },
      create: {
        userId,
        type: "oauth",
        provider: "mailchimp",
        providerAccountId: mailchimpUserId,
        access_token: tokens.access_token,
        token_type: "Bearer",
        session_state: meta.dc,
        scope: meta.api_endpoint,
      },
    });

    return NextResponse.redirect(
      new URL("/?mailchimp_connected=true", baseUrl)
    );
  } catch (err) {
    console.error("[connect-mailchimp] Error:", err);
    return NextResponse.redirect(
      new URL("/?error=mailchimp_unknown", baseUrl)
    );
  }
}
