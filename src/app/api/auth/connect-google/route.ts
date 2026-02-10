import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Initiates a Google OAuth flow specifically for linking Google Analytics
 * to an existing (email/password) account. The user must already be signed in.
 */
export async function GET() {
  const session = await auth();
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";

  if (!(session as { userId?: string })?.userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const state = crypto.randomBytes(32).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("ga_connect_state", state, {
    httpOnly: true,
    secure: baseUrl.startsWith("https://"),
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${baseUrl}/api/auth/connect-google/callback`,
    response_type: "code",
    scope:
      "openid email profile https://www.googleapis.com/auth/analytics.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
