import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getValidGoogleTokenForUser } from "@/lib/google-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/gsc/accessible-sites
 *
 * Lists the Google Search Console sites accessible to the authenticated user.
 * Filters to siteOwner and siteFullUser permission levels.
 */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Force-refresh to ensure token has webmasters scope
  const accessToken = await getValidGoogleTokenForUser(userId, true);

  if (!accessToken) {
    return NextResponse.json(
      { error: "No Google token available. Please connect Search Console first." },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(
      "https://www.googleapis.com/webmasters/v3/sites",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("[accessible-sites] GSC API error:", res.status, errorBody);

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          { error: "missing_gsc_scope", needsReconnect: true, message: "Search Console scope not granted. Please reconnect with Search Console permissions." },
          { status: 403 }
        );
      }

      let detail = errorBody;
      try {
        const parsed = JSON.parse(errorBody);
        detail = parsed.error?.message || errorBody;
      } catch {
        // use raw body
      }

      return NextResponse.json(
        { error: "Failed to list Search Console sites", detail },
        { status: res.status }
      );
    }

    const data = (await res.json()) as {
      siteEntry?: Array<{ siteUrl: string; permissionLevel: string }>;
    };

    // Filter to owner and full user permissions
    const sites = (data.siteEntry || [])
      .filter((s) => s.permissionLevel === "siteOwner" || s.permissionLevel === "siteFullUser")
      .map((s) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel }));

    return NextResponse.json({ sites });
  } catch (err) {
    console.error("[accessible-sites] Error:", err);
    return NextResponse.json(
      { error: "Failed to list Search Console sites" },
      { status: 500 }
    );
  }
}
