import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/connect-mailchimp
 *
 * Initiates a Mailchimp OAuth flow. Mailchimp tokens have no scopes —
 * a single authorization grants full account access.
 */
export async function GET() {
  const session = await auth();
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";

  if (!(session as { userId?: string })?.userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const state = crypto.randomBytes(32).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("mailchimp_state", state, {
    httpOnly: true,
    secure: baseUrl.startsWith("https://"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.MAILCHIMP_CLIENT_ID!,
    redirect_uri: (process.env.MAILCHIMP_REDIRECT_URI || `${baseUrl}/api/auth/connect-mailchimp/callback`),
    state,
  });

  return NextResponse.redirect(
    `https://login.mailchimp.com/oauth2/authorize?${params.toString()}`
  );
}
