/**
 * One-time migration script: migrates Team-centric data to Organization-centric model.
 *
 * 1. For each Team → create Organization (same name, owner)
 * 2. For each TeamMembership → create OrgMembership
 * 3. For each TeamInvite → create OrgInvite
 * 4. For solo users (no team) → create Organization named "{userName}'s Account"
 * 5. Set orgId on all DataSources, Chats, EmailAlerts
 * 6. Set activeOrgId on all Users
 *
 * Usage: npx tsx scripts/migrate-to-orgs.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting organization migration...\n");

  // Track mapping from teamId → orgId
  const teamToOrg = new Map<string, string>();

  // ── Step 1: Migrate Teams → Organizations ──
  const teams = await prisma.team.findMany({
    include: {
      memberships: true,
      invites: true,
    },
  });

  console.log(`Found ${teams.length} teams to migrate.`);

  for (const team of teams) {
    // Check if org already exists for this owner (idempotent)
    const existing = await prisma.organization.findFirst({
      where: { ownerId: team.ownerId },
    });

    if (existing) {
      console.log(`  ⏭ Org already exists for team "${team.name}" (owner ${team.ownerId})`);
      teamToOrg.set(team.id, existing.id);
      continue;
    }

    const org = await prisma.organization.create({
      data: {
        name: team.name,
        ownerId: team.ownerId,
      },
    });
    teamToOrg.set(team.id, org.id);
    console.log(`  ✓ Created org "${org.name}" (${org.id}) from team "${team.name}"`);

    // ── Step 2: Migrate TeamMemberships → OrgMemberships ──
    for (const membership of team.memberships) {
      const existingMembership = await prisma.orgMembership.findUnique({
        where: { orgId_userId: { orgId: org.id, userId: membership.userId } },
      });
      if (existingMembership) continue;

      await prisma.orgMembership.create({
        data: {
          orgId: org.id,
          userId: membership.userId,
          role: membership.role,
        },
      });
    }

    // Also create admin membership for the owner if not already a team member
    const ownerIsMember = team.memberships.some((m) => m.userId === team.ownerId);
    if (!ownerIsMember) {
      const existingOwnerMembership = await prisma.orgMembership.findUnique({
        where: { orgId_userId: { orgId: org.id, userId: team.ownerId } },
      });
      if (!existingOwnerMembership) {
        await prisma.orgMembership.create({
          data: {
            orgId: org.id,
            userId: team.ownerId,
            role: "admin",
          },
        });
      }
    }

    console.log(`    → Migrated ${team.memberships.length} memberships`);

    // ── Step 3: Migrate TeamInvites → OrgInvites ──
    for (const invite of team.invites) {
      const existingInvite = await prisma.orgInvite.findUnique({
        where: { orgId_email: { orgId: org.id, email: invite.email } },
      });
      if (existingInvite) continue;

      await prisma.orgInvite.create({
        data: {
          orgId: org.id,
          email: invite.email,
          expiresAt: invite.expiresAt,
          acceptedAt: invite.acceptedAt,
        },
      });
    }

    if (team.invites.length > 0) {
      console.log(`    → Migrated ${team.invites.length} invites`);
    }
  }

  // ── Step 4: Create orgs for solo users (no team) ──
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  let soloCount = 0;
  for (const user of allUsers) {
    // Skip if user already has an org (as owner)
    const existingOrg = await prisma.organization.findFirst({
      where: { ownerId: user.id },
    });
    if (existingOrg) continue;

    // Skip if user is a member of any org already
    const existingMembership = await prisma.orgMembership.findFirst({
      where: { userId: user.id },
    });
    if (existingMembership) continue;

    const orgName = user.name ? `${user.name}'s Account` : "My Account";
    const org = await prisma.organization.create({
      data: {
        name: orgName,
        ownerId: user.id,
      },
    });

    // Create admin membership
    await prisma.orgMembership.create({
      data: {
        orgId: org.id,
        userId: user.id,
        role: "admin",
      },
    });

    soloCount++;
  }
  console.log(`\nCreated ${soloCount} orgs for solo users.`);

  // ── Step 5: Set orgId on DataSources, Chats, EmailAlerts ──

  // DataSources: use teamId mapping first, then fall back to userId's org
  const dataSources = await prisma.dataSource.findMany({
    where: { orgId: null },
    select: { id: true, userId: true, teamId: true },
  });

  let dsUpdated = 0;
  for (const ds of dataSources) {
    let orgId: string | undefined;

    if (ds.teamId && teamToOrg.has(ds.teamId)) {
      orgId = teamToOrg.get(ds.teamId);
    }

    if (!orgId) {
      const userOrg = await prisma.organization.findFirst({
        where: { ownerId: ds.userId },
        select: { id: true },
      });
      orgId = userOrg?.id;
    }

    if (!orgId) {
      // User is a member of an org but not an owner
      const membership = await prisma.orgMembership.findFirst({
        where: { userId: ds.userId },
        select: { orgId: true },
      });
      orgId = membership?.orgId;
    }

    if (orgId) {
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { orgId },
      });
      dsUpdated++;
    } else {
      console.warn(`  ⚠ No org found for DataSource ${ds.id} (user ${ds.userId})`);
    }
  }
  console.log(`Updated ${dsUpdated}/${dataSources.length} DataSources with orgId.`);

  // Chats
  const chats = await prisma.chat.findMany({
    where: { orgId: null },
    select: { id: true, userId: true },
  });

  let chatUpdated = 0;
  for (const chat of chats) {
    const userOrg = await prisma.organization.findFirst({
      where: { ownerId: chat.userId },
      select: { id: true },
    });
    let orgId = userOrg?.id;

    if (!orgId) {
      const membership = await prisma.orgMembership.findFirst({
        where: { userId: chat.userId },
        select: { orgId: true },
      });
      orgId = membership?.orgId;
    }

    if (orgId) {
      await prisma.chat.update({
        where: { id: chat.id },
        data: { orgId },
      });
      chatUpdated++;
    }
  }
  console.log(`Updated ${chatUpdated}/${chats.length} Chats with orgId.`);

  // EmailAlerts
  const alerts = await prisma.emailAlert.findMany({
    where: { orgId: null },
    select: { id: true, userId: true },
  });

  let alertUpdated = 0;
  for (const alert of alerts) {
    const userOrg = await prisma.organization.findFirst({
      where: { ownerId: alert.userId },
      select: { id: true },
    });
    let orgId = userOrg?.id;

    if (!orgId) {
      const membership = await prisma.orgMembership.findFirst({
        where: { userId: alert.userId },
        select: { orgId: true },
      });
      orgId = membership?.orgId;
    }

    if (orgId) {
      await prisma.emailAlert.update({
        where: { id: alert.id },
        data: { orgId },
      });
      alertUpdated++;
    }
  }
  console.log(`Updated ${alertUpdated}/${alerts.length} EmailAlerts with orgId.`);

  // ── Step 6: Set activeOrgId on all Users ──
  const usersWithoutActiveOrg = await prisma.user.findMany({
    where: { activeOrgId: null },
    select: { id: true },
  });

  let userUpdated = 0;
  for (const user of usersWithoutActiveOrg) {
    const ownedOrg = await prisma.organization.findFirst({
      where: { ownerId: user.id },
      select: { id: true },
    });

    let orgId = ownedOrg?.id;
    if (!orgId) {
      const membership = await prisma.orgMembership.findFirst({
        where: { userId: user.id },
        select: { orgId: true },
      });
      orgId = membership?.orgId;
    }

    if (orgId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { activeOrgId: orgId },
      });
      userUpdated++;
    }
  }
  console.log(`Set activeOrgId for ${userUpdated}/${usersWithoutActiveOrg.length} users.`);

  console.log("\n✅ Migration complete!");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
