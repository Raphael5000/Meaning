/**
 * One-off: Create 4 brand accounts and assign data sources.
 * Drops the ownerId unique constraint first since prisma db push hasn't run yet.
 *
 * Usage: npx tsx scripts/setup-accounts.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error("DATABASE_URL is required"); process.exit(1); }

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const OWNER_ID = "cmmbtyn3s0000011mjlwvhcez";

const BRANDS: Record<string, { ga4PropertyId: string }> = {
  "WhoYou": { ga4PropertyId: "484056386" },
  "Magixm": { ga4PropertyId: "271992166" },
  "Decentral Energy": { ga4PropertyId: "379503029" },
  "Code Capsules": { ga4PropertyId: "404628120" },
};

async function main() {
  // Drop the unique constraint on ownerId so one user can own multiple orgs
  try {
    await prisma.$executeRaw`ALTER TABLE "Organization" DROP CONSTRAINT IF EXISTS "Organization_ownerId_key"`;
    console.log("Dropped ownerId unique constraint");
  } catch (err) {
    console.log("Constraint may already be dropped:", err);
  }

  // Step 1: Rename existing org "My Team" → "WhoYou"
  const existingOrg = await prisma.organization.findFirst({ where: { ownerId: OWNER_ID } });
  if (!existingOrg) {
    console.error("No existing org found for owner");
    process.exit(1);
  }

  await prisma.organization.update({
    where: { id: existingOrg.id },
    data: { name: "WhoYou" },
  });
  console.log(`Renamed "${existingOrg.name}" → "WhoYou" (${existingOrg.id})`);

  const orgIds: Record<string, string> = { "WhoYou": existingOrg.id };

  // Step 2: Create the other 3 orgs
  for (const brand of ["Magixm", "Decentral Energy", "Code Capsules"]) {
    const id = `org_${brand.toLowerCase().replace(/\s+/g, "_")}`;

    const existing = await prisma.organization.findUnique({ where: { id } });
    if (existing) {
      console.log(`Org "${brand}" already exists (${id})`);
      orgIds[brand] = id;
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO "Organization" (id, name, "ownerId", "createdAt", "updatedAt")
      VALUES (${id}, ${brand}, ${OWNER_ID}, NOW(), NOW())
    `;
    console.log(`Created org "${brand}" (${id})`);
    orgIds[brand] = id;

    // Create admin membership
    const membershipId = `mem_${id}`;
    await prisma.$executeRaw`
      INSERT INTO "OrgMembership" (id, "orgId", "userId", role, "createdAt")
      VALUES (${membershipId}, ${id}, ${OWNER_ID}, 'admin', NOW())
      ON CONFLICT ("orgId", "userId") DO NOTHING
    `;
  }

  // Step 3: Assign DataSources to the correct org
  const allDs = await prisma.dataSource.findMany({
    select: { id: true, type: true, propertyId: true, ga4PropertyId: true },
  });

  for (const ds of allDs) {
    let brand: string | null = null;

    if (ds.type === "GA4_BIGQUERY") {
      for (const [b, config] of Object.entries(BRANDS)) {
        if (ds.propertyId === config.ga4PropertyId) { brand = b; break; }
      }
    } else {
      for (const [b, config] of Object.entries(BRANDS)) {
        if (ds.ga4PropertyId === config.ga4PropertyId) { brand = b; break; }
      }
    }

    if (brand && orgIds[brand]) {
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { orgId: orgIds[brand] },
      });
      console.log(`  ${ds.type} ${ds.propertyId} → ${brand}`);
    } else {
      console.warn(`  ⚠ No brand match for ${ds.type} ${ds.propertyId} (ga4: ${ds.ga4PropertyId})`);
    }
  }

  // Step 4: Set activeOrgId to WhoYou
  await prisma.user.update({
    where: { id: OWNER_ID },
    data: { activeOrgId: orgIds["WhoYou"] },
  });
  console.log(`\nSet activeOrgId to WhoYou`);

  console.log("\nAccounts:", orgIds);
  console.log("\n✅ Done!");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
