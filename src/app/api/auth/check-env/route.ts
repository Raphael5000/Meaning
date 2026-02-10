import { NextResponse } from "next/server";

const REQUIRED = [
  "AUTH_SECRET",
  "NEXTAUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

/**
 * Dev-only: GET /api/auth/check-env to see which auth env vars are missing.
 * Fix these in .env to resolve the Configuration error.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  const present = REQUIRED.filter((key) => process.env[key]?.trim());
  return NextResponse.json({
    ok: missing.length === 0,
    missing,
    present,
    hint: missing.length
      ? "Add the missing variables to .env (no quotes, no spaces). AUTH_SECRET: run 'openssl rand -base64 32'. Google: use values from Google Cloud Console → APIs & Credentials → OAuth 2.0 Client ID."
      : "All required auth env vars are set. If you still see Configuration error, check that values are real (not placeholders like 'your_nextauth_secret').",
  });
}
