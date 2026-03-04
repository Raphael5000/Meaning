import { prisma } from "@/lib/prisma";

/**
 * Returns the list of GA4 property IDs a user is allowed to access.
 * - If the user has no team membership (they're an admin / solo user) → "all"
 * - If the user is a team member → returns their allowed property IDs
 */
export async function getAllowedPropertyIds(
  userId: string
): Promise<string[] | "all"> {
  const membership = await prisma.teamMembership.findFirst({
    where: { userId },
    select: { properties: true },
  });

  if (!membership) return "all";
  return membership.properties;
}
