import { prisma } from "@/lib/prisma";

/**
 * Get the Google access token for a user.
 * Tries the session JWT first, falls back to a DB lookup
 * (needed for credentials users who linked Google separately).
 */
export async function getGoogleAccessToken(
  session: { accessToken?: string; userId?: string } | null
): Promise<string | null> {
  // Fast path: token already in JWT (Google OAuth sign-in users)
  if (session?.accessToken) {
    return session.accessToken;
  }

  // Fallback: look up from Account table (credentials users who linked Google)
  const userId = session?.userId;
  if (!userId) return null;

  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { access_token: true },
    });
    return account?.access_token ?? null;
  } catch (err) {
    console.error("[google-token] DB lookup failed:", err);
    return null;
  }
}
