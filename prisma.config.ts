// Load .env when available (local dev); on Code Capsules env vars are injected, so dotenv is optional
try {
  require("dotenv/config");
} catch {
  // dotenv not installed or not needed (e.g. production with platform env vars)
}
import { defineConfig } from "prisma/config";

// Trim in case of copy-paste whitespace; require Postgres URL (from .env or from env)
const raw = process.env["DATABASE_URL"] ?? "";
const url = raw.trim();
if (!url || (!url.startsWith("postgresql://") && !url.startsWith("postgres://"))) {
  throw new Error(
    "DATABASE_URL must be set and start with postgresql:// or postgres://. Set it in .env or run: DATABASE_URL='postgresql://user:pass@host:5432/db' npx prisma migrate deploy"
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});
