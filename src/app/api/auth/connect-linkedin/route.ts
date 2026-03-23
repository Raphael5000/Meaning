import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/connect-linkedin
 *
 * Initiates a LinkedIn OAuth flow requesting organization-level scopes
 * for reading company page analytics (Community Management API).
 */
export async function GET() {
  const session = await auth();
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";

  if (!(session as { userId?: string })?.userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const state = crypto.randomBytes(32).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("linkedin_state", state, {
    httpOnly: true,
    secure: baseUrl.startsWith("https://"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${baseUrl}/api/auth/connect-linkedin/callback`,
    state,
    scope: "r_organization_social rw_organization_admin r_basicprofile",
  });

  return NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  );
}
