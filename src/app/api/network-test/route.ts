import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Temporary route to test outbound connectivity to Google (OAuth token endpoint).
 * Hit GET /api/network-test – if it returns ETIMEDOUT, the capsule cannot reach Google.
 * Remove this file once auth is working.
 */
export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    // We expect 400 (bad request) without real params; we only care about connectivity
    return NextResponse.json({
      ok: true,
      reachable: true,
      status: res.status,
      message:
        res.status === 400
          ? "Reached Google (400 expected without real code)"
          : `Google responded with ${res.status}`,
    });
  } catch (e: unknown) {
    clearTimeout(timeout);
    const err = e as { code?: string; message?: string };
    return NextResponse.json(
      {
        ok: false,
        reachable: false,
        code: err.code ?? "UNKNOWN",
        message: err.message ?? String(e),
      },
      { status: 200 }
    );
  }
}
