import { prisma } from "@/lib/prisma";

/**
 * Get a valid Attio API key for a user + workspace.
 * Each workspace has its own Account record (providerAccountId = attio_{userId}_{workspaceId}).
 * Falls back to the legacy single-key format (attio_{userId}) for existing connections.
 */
export async function getAttioApiKey(
  userId: string,
  workspaceId?: string,
): Promise<string | null> {
  try {
    // Try workspace-scoped key first
    if (workspaceId) {
      const scoped = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "attio",
            providerAccountId: `attio_${userId}_${workspaceId}`,
          },
        },
        select: { access_token: true },
      });
      if (scoped?.access_token) return scoped.access_token;
    }

    // Fall back to legacy single-key format
    const legacy = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "attio",
          providerAccountId: `attio_${userId}`,
        },
      },
      select: { access_token: true },
    });
    if (legacy?.access_token) return legacy.access_token;

    return null;
  } catch (err) {
    console.error("[attio-token] DB lookup failed:", err);
    return null;
  }
}
