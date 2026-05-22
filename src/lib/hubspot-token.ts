import { prisma } from "@/lib/prisma";

/**
 * Get a valid HubSpot Private App token for a user.
 * HubSpot Private App tokens don't expire — just checks it exists.
 */
export async function getHubSpotApiKey(
  userId: string
): Promise<string | null> {
  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "hubspot" },
      select: { access_token: true },
    });

    if (!account?.access_token) return null;
    return account.access_token;
  } catch (err) {
    console.error("[hubspot-token] DB lookup failed:", err);
    return null;
  }
}
