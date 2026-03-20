import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getValidGoogleTokenForUser } from "@/lib/google-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/ads/accessible-customers
 *
 * Lists the Google Ads customer accounts accessible to the authenticated user.
 * Requires GOOGLE_ADS_DEVELOPER_TOKEN env var (get from Google Ads API Center).
 *
 * Always reads the token from the DB (not session JWT) to ensure we have
 * the latest token with the adwords scope after the OAuth flow.
 */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    console.error("[accessible-customers] GOOGLE_ADS_DEVELOPER_TOKEN env var not set");
    return NextResponse.json(
      { error: "Google Ads not configured. Developer token missing." },
      { status: 500 }
    );
  }

  // Force-refresh to ensure token has adwords scope (old token may be cached without it)
  const accessToken = await getValidGoogleTokenForUser(userId, true);

  if (!accessToken) {
    return NextResponse.json(
      { error: "No Google token available. Please connect Google Ads first." },
      { status: 401 }
    );
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
    };

    // If an MCC login customer ID is configured, include it
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
    if (loginCustomerId) {
      headers["login-customer-id"] = loginCustomerId.replace(/-/g, "");
    }

    const res = await fetch(
      "https://googleads.googleapis.com/v20/customers:listAccessibleCustomers",
      { headers }
    );

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("[accessible-customers] Google Ads API error:", res.status, errorBody);

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          { error: "missing_ads_scope", needsReconnect: true, message: "Google Ads scope not granted. Please reconnect with Ads permissions." },
          { status: 403 }
        );
      }

      // Parse error details if possible
      let detail = errorBody;
      try {
        const parsed = JSON.parse(errorBody);
        detail = parsed.error?.message || errorBody;
      } catch {
        // use raw body
      }

      return NextResponse.json(
        { error: "Failed to list Google Ads accounts", detail },
        { status: res.status }
      );
    }

    const data = (await res.json()) as { resourceNames?: string[] };
    const customerIds = (data.resourceNames || []).map((rn: string) =>
      rn.replace("customers/", "")
    );

    return NextResponse.json({ customerIds });
  } catch (err) {
    console.error("[accessible-customers] Error:", err);
    return NextResponse.json(
      { error: "Failed to list Google Ads accounts" },
      { status: 500 }
    );
  }
}
