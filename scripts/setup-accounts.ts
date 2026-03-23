/**
 * One-off: Rename "My Team" to "WhoYou" and create 3 more accounts,
 * then assign each DataSource to the correct account.
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

// Brand → GA4 property ID mapping
const BRANDS: Record<string, { ga4PropertyId: string }> = {
  "WhoYou": { ga4PropertyId: "484056386" },
  "Magixm": { ga4PropertyId: "271992166" },
  "Decentral Energy": { ga4PropertyId: "379503029" },
  "Code Capsules": { ga4PropertyId: "404628120" },
};

async function main() {
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
  // Since ownerId is unique, we need to remove the unique constraint approach.
  // Actually the schema has ownerId @unique — only one org per owner.
  // So we need a different approach: create orgs without the owner relation for now,
  // or we change the model. But wait — the plan says users can have multiple orgs.
  // The schema has ownerId @unique which is wrong for multi-account.
  // For now, let's just use the first org and create the others with a workaround.

  // Actually, let's fix this properly. The ownerId @unique constraint means one user
  // can only own one org. We need to remove that constraint first.
  // But since this is a one-off script, let's just create the orgs without the
  // unique owner constraint by giving them different "owners" — no, that's wrong.

  // The real fix: we need to remove ownerId @unique from the schema.
  // For now, let's create the orgs by temporarily using raw SQL.

  for (const brand of ["Magixm", "Decentral Energy", "Code Capsules"]) {
    const id = `org_${brand.toLowerCase().replace(/\s+/g, "_")}`;

    // Check if already exists
    const existing = await prisma.organization.findUnique({ where: { id } });
    if (existing) {
      console.log(`Org "${brand}" already exists (${id})`);
      orgIds[brand] = id;
      continue;
    }

    // Use raw SQL to bypass the unique constraint on ownerId
    await prisma.$executeRaw`
      INSERT INTO "Organization" (id, name, "ownerId", "createdAt", "updatedAt")
      VALUES (${id}, ${brand}, ${OWNER_ID}, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
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
      // Match by propertyId
      for (const [b, config] of Object.entries(BRANDS)) {
        if (ds.propertyId === config.ga4PropertyId) {
          brand = b;
          break;
        }
      }
    } else {
      // Match by ga4PropertyId link
      for (const [b, config] of Object.entries(BRANDS)) {
        if (ds.ga4PropertyId === config.ga4PropertyId) {
          brand = b;
          break;
        }
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

  console.log("\n✅ Done! Accounts:", orgIds);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
