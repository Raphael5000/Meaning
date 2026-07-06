import { prisma } from "@/lib/prisma";

/**
 * Get a valid Attio API key for a user + workspace.
 * Each workspace has its own Account record (providerAccountId = attio_{userId}_{workspaceId}).
 * Falls back to the legacy single-key format (attio_{userId}) only when no workspaceId is given.
 */
export async function getAttioApiKey(
  userId: string,
  workspaceId?: string,
): Promise<string | null> {
  try {
    // Workspace-scoped key
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
      return scoped?.access_token ?? null;
    }

    // No workspace specified — try legacy single-key format
    const legacy = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "attio",
          providerAccountId: `attio_${userId}`,
        },
      },
      select: { access_token: true },
    });
    return legacy?.access_token ?? null;
  } catch (err) {
    console.error("[attio-token] DB lookup failed:", err);
    return null;
  }
}
