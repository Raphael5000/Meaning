/**
 * One-off: Clear orgId from all DataSources so user can reconnect via ConnectionsPanel.
 * Usage: npx tsx scripts/clear-datasource-orgs.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error("DATABASE_URL is required"); process.exit(1); }

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.dataSource.updateMany({
    where: { orgId: { not: null } },
    data: { orgId: null },
  });
  console.log(`Cleared orgId on ${result.count} DataSources`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
