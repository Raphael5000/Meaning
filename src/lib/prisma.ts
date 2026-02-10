import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined;
};

// PostgreSQL via DATABASE_URL (Supabase in prod; use Supabase or local Postgres for dev)
function getClient(): PrismaClient {
  if (!globalForPrisma._prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is required (e.g. Supabase connection string). See .env.example."
      );
    }
    const adapter = new PrismaPg({ connectionString });
    globalForPrisma._prisma = new PrismaClient({ adapter });
  }
  return globalForPrisma._prisma;
}

// Lazy proxy so PrismaClient is only constructed on first actual use,
// not at module-load time (which happens during the Next.js build phase).
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
