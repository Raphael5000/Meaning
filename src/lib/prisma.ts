import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined;
};

// Prisma 7 requires a driver adapter for SQLite at runtime
const datasourceUrl =
  process.env.DATABASE_URL ?? "file:./dev.db";

function getClient(): PrismaClient {
  if (!globalForPrisma._prisma) {
    const adapter = new PrismaBetterSqlite3({ url: datasourceUrl });
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
