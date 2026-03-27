import { prisma } from "@/lib/prisma";

/**
 * Get a valid (non-expired) Microsoft Ads access token for a user.
 *
 * Reads the microsoft-ads Account from the DB, checks expiry, and refreshes
 * using Azure AD token endpoint if expired. Persists the refreshed token
 * back to the Account table so cron jobs get fresh tokens.
 */
export async function getValidMicrosoftAdsTokenForUser(
  userId: string,
  forceRefresh = false
): Promise<string | null> {
  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "microsoft-ads" },
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    });

    if (!account) return null;

    // Check if the token is still valid (with 5-minute buffer)
    const bufferSeconds = 300;
    const isExpired =
      !account.expires_at ||
      Date.now() >= (account.expires_at - bufferSeconds) * 1000;

    if (!forceRefresh && !isExpired && account.access_token) {
      return account.access_token;
    }

    // Token is expired — try to refresh
    if (!account.refresh_token) {
      console.error(
        `[microsoft-ads-token] No refresh_token for user ${userId}, cannot refresh`
      );
      return account.access_token ?? null;
    }

    const clientId = process.env.MICROSOFT_ADS_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_ADS_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error("[microsoft-ads-token] Missing MICROSOFT_ADS_CLIENT_ID or MICROSOFT_ADS_CLIENT_SECRET");
      return account.access_token ?? null;
    }

    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: account.refresh_token,
          scope: "https://ads.microsoft.com/msads.manage offline_access",
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[microsoft-ads-token] Token refresh failed for user ${userId}:`,
        response.status,
        errorBody
      );
      return account.access_token ?? null;
    }

    const tokens = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    // Persist the refreshed token to the Account table
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token,
        expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
        ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
      },
    });

    return tokens.access_token;
  } catch (err) {
    console.error("[microsoft-ads-token] DB lookup / refresh failed:", err);
    return null;
  }
}
