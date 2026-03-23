import { prisma } from "@/lib/prisma";

/** Get the user's active organization (or their first org as fallback) */
export async function getActiveOrg(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeOrgId: true },
  });

  if (user?.activeOrgId) {
    const org = await prisma.organization.findUnique({
      where: { id: user.activeOrgId },
      select: { id: true, name: true, imageUrl: true, ownerId: true },
    });
    if (org) return org;
  }

  // Fallback: first org user owns or is a member of
  const owned = await prisma.organization.findFirst({
    where: { ownerId: userId },
    select: { id: true, name: true, imageUrl: true, ownerId: true },
  });
  if (owned) return owned;

  const membership = await prisma.orgMembership.findFirst({
    where: { userId },
    select: {
      org: { select: { id: true, name: true, imageUrl: true, ownerId: true } },
    },
  });
  return membership?.org ?? null;
}

/** Get all organizations a user belongs to (owned + member) */
export async function getUserOrgs(userId: string) {
  const [ownedOrgs, memberships] = await Promise.all([
    prisma.organization.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, imageUrl: true, ownerId: true },
    }),
    prisma.orgMembership.findMany({
      where: { userId },
      select: {
        role: true,
        org: { select: { id: true, name: true, imageUrl: true, ownerId: true } },
      },
    }),
  ]);

  const orgs: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    ownerId: string;
    role: string;
  }> = [];

  for (const owned of ownedOrgs) {
    orgs.push({ ...owned, role: "admin" });
  }

  for (const m of memberships) {
    // Avoid duplicates if owner also has a membership row
    if (!orgs.some((o) => o.id === m.org.id)) {
      orgs.push({ ...m.org, role: m.role });
    }
  }

  return orgs;
}

/** Get all data sources for an organization */
export async function getOrgDataSources(orgId: string) {
  return prisma.dataSource.findMany({
    where: { orgId },
    select: {
      id: true,
      type: true,
      propertyId: true,
      bigqueryDataset: true,
      adsCustomerId: true,
      ga4PropertyId: true,
      status: true,
    },
  });
}

/** Check if a user is a member (or owner) of an organization */
export async function isOrgMember(
  userId: string,
  orgId: string
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });

  if (org?.ownerId === userId) return true;

  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
    select: { id: true },
  });

  return !!membership;
}

/** Check if a user is an admin (owner) of an organization */
export async function isOrgAdmin(
  userId: string,
  orgId: string
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });
  return org?.ownerId === userId;
}
