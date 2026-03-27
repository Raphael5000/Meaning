import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/connect-microsoft-ads
 *
 * Initiates an Azure AD OAuth flow to get Microsoft Ads permissions.
 * Requests msads.manage scope for the Bing Ads API.
 */
export async function GET() {
  const session = await auth();
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";

  if (!(session as { userId?: string })?.userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const state = crypto.randomBytes(32).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("ms_ads_state", state, {
    httpOnly: true,
    secure: baseUrl.startsWith("https://"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_ADS_CLIENT_ID!,
    redirect_uri: `${baseUrl}/api/auth/connect-microsoft-ads/callback`,
    response_type: "code",
    scope: "https://ads.microsoft.com/msads.manage offline_access",
    state,
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
  );
}
