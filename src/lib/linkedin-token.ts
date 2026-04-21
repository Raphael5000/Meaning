import { prisma } from "@/lib/prisma";

/**
 * Get a valid (non-expired) LinkedIn access token for a user.
 *
 * Reads the LinkedIn account from the DB, checks expiry, and refreshes
 * using the refresh_token if expired. Persists the refreshed token back
 * to the Account table.
 *
 * LinkedIn tokens expire after ~2 months (5,184,000 seconds).
 */
export async function getValidLinkedInTokenForUser(
  userId: string,
  forceRefresh = false
): Promise<string | null> {
  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "linkedin" },
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
      throw new Error(
        `LinkedIn token expired and no refresh_token for user ${userId}. User must reconnect their LinkedIn account.`
      );
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET env vars");
    }

    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[linkedin-token] Token refresh failed for user ${userId}:`,
        response.status,
        errorBody
      );
      throw new Error(
        `LinkedIn token refresh failed (${response.status}). User may need to reconnect their LinkedIn account.`
      );
    }

    const tokens = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
    };

    // Persist the refreshed token
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
    console.error("[linkedin-token] DB lookup / refresh failed:", err);
    return null;
  }
}
