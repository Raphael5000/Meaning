import { prisma } from "@/lib/prisma";

/**
 * Get the Google access token for a user.
 * Tries the session JWT first (populated from the Account table by
 * the JWT callback), then falls back to a direct DB lookup.
 * For team members, the JWT already contains the admin's token (set in auth.ts).
 */
export async function getGoogleAccessToken(
  session: { accessToken?: string; userId?: string; teamAdminId?: string } | null
): Promise<string | null> {
  // Fast path: token already in JWT (Google OAuth sign-in users or team members)
  if (session?.accessToken) {
    return session.accessToken;
  }

  // For team members, use the admin's Google token
  const tokenOwnerId = session?.teamAdminId || session?.userId;
  if (!tokenOwnerId) return null;

  return getValidGoogleTokenForUser(tokenOwnerId);
}

/**
 * Get the Google access token for a team admin by their userId.
 * Used when a team member needs to make API calls using the admin's credentials.
 */
export async function getGoogleAccessTokenForTeam(
  adminUserId: string
): Promise<string | null> {
  return getValidGoogleTokenForUser(adminUserId);
}

/**
 * Get a valid (non-expired) Google access token for a user by their userId.
 *
 * Reads the Google account from the DB, checks expiry, and refreshes
 * the token using the refresh_token if it has expired. Persists the
 * refreshed token back to the Account table so future reads are fresh.
 *
 * Used by the cron send endpoint and as a fallback for session-based lookups.
 */
export async function getValidGoogleTokenForUser(
  userId: string,
  forceRefresh = false
): Promise<string | null> {
  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
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
        `Google token expired and no refresh_token for user ${userId}. User must reconnect their Google account.`
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[google-token] Token refresh failed for user ${userId}:`,
        response.status,
        errorBody
      );
      throw new Error(
        `Google token refresh failed (${response.status}). User may need to reconnect their Google account.`
      );
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
    console.error("[google-token] DB lookup / refresh failed:", err);
    return null;
  }
}
