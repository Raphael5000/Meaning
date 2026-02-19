import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listProperties } from "@/lib/ga4";
import { getGoogleAccessToken } from "@/lib/google-token";

export async function GET() {
  const session = await auth();
  const accessToken = await getGoogleAccessToken(
    session as { accessToken?: string; userId?: string } | null
  );

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const properties = await listProperties(accessToken);
    return NextResponse.json({ properties });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch properties";
    // Include full error body from Google API if present (helps debug "API not enabled")
    const body =
      error &&
      typeof error === "object" &&
      "body" in error &&
      typeof (error as { body?: unknown }).body === "object"
        ? (error as { body: unknown }).body
        : undefined;
    return NextResponse.json(
      { error: message, details: body },
      { status: 500 }
    );
  }
}
