import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/connect-google-admin
 *
 * Initiates a second Google OAuth flow that requests the `analytics.edit`
 * scope. This elevated permission is needed to create a BigQuery export
 * link on the user's GA4 property via the Admin API.
 *
 * The user must already be signed in and have a Google account linked.
 */
export async function GET() {
  const session = await auth();
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";

  if (!(session as { userId?: string })?.userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const state = crypto.randomBytes(32).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("ga_admin_state", state, {
    httpOnly: true,
    secure: baseUrl.startsWith("https://"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${baseUrl}/api/auth/connect-google-admin/callback`,
    response_type: "code",
    scope:
      "openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.edit",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
