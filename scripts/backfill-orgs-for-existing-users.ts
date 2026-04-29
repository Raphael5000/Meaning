/**
 * One-time backfill: ensure every existing User has an Organization +
 * admin OrgMembership. New signups handle this automatically (via NextAuth
 * events.createUser for OAuth and inline in /api/auth/register for
 * credentials), but pre-launch users predate that logic.
 *
 * Idempotent — safe to run multiple times. Skips users who already own an
 * org or are a member of an org via membership.
 *
 * Usage: pnpm tsx scripts/backfill-orgs-for-existing-users.ts
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
  console.log("Backfilling Organizations for existing users...\n");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      orgOwned: { select: { id: true } },
      orgMemberships: { select: { orgId: true } },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    // User already has an org (either as owner or member) — skip.
    if (user.orgOwned.length > 0 || user.orgMemberships.length > 0) {
      skipped++;
      continue;
    }

    const firstName =
      ((user.name ?? user.email?.split("@")[0]) || "User").split(" ")[0] ||
      "User";
    const orgName = `${firstName}'s workspace`;

    await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName, ownerId: user.id },
      });
      await tx.orgMembership.create({
        data: { orgId: org.id, userId: user.id, role: "admin" },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { activeOrgId: org.id },
      });
      console.log(`  ✓ Created org "${orgName}" for ${user.email}`);
    });

    created++;
  }

  console.log(`\nDone. Created ${created} orgs, skipped ${skipped} users.`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
