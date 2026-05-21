import { prisma } from "@/lib/prisma";

/**
 * Get a valid Ahrefs access token for a user.
 *
 * Reads the Ahrefs account from the DB and checks expiry.
 * Ahrefs tokens last ~1 year with no refresh — if expired, the user
 * must re-authorize via OAuth.
 */
export async function getAhrefsApiKey(
  userId: string
): Promise<string | null> {
  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "ahrefs" },
      select: { access_token: true, expires_at: true },
    });

    if (!account?.access_token) return null;

    // Check expiry (with 1-day buffer)
    if (account.expires_at) {
      const bufferSeconds = 86400;
      const isExpired =
        Date.now() >= (account.expires_at - bufferSeconds) * 1000;
      if (isExpired) {
        console.warn(
          `[ahrefs-token] Token expired for user ${userId}. User must reconnect their Ahrefs account.`
        );
        return null;
      }
    }

    return account.access_token;
  } catch (err) {
    console.error("[ahrefs-token] DB lookup failed:", err);
    return null;
  }
}
