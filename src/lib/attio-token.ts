import { prisma } from "@/lib/prisma";

/**
 * Get a valid Attio API key for a user.
 * Attio API keys don't expire — just checks it exists.
 */
export async function getAttioApiKey(
  userId: string
): Promise<string | null> {
  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "attio" },
      select: { access_token: true },
    });

    if (!account?.access_token) return null;
    return account.access_token;
  } catch (err) {
    console.error("[attio-token] DB lookup failed:", err);
    return null;
  }
}
