// Load .env when available (local dev); on Code Capsules env vars are injected, so dotenv is optional
try {
  require("dotenv/config");
} catch {
  // dotenv not installed or not needed (e.g. production with platform env vars)
}
import { defineConfig } from "prisma/config";

// Trim in case of copy-paste whitespace; require Postgres URL (from .env or from env)
// In CI (prisma generate only), DATABASE_URL may not exist — use a placeholder so generation succeeds
const raw = process.env["DATABASE_URL"] ?? "";
const url = raw.trim();
const isValidUrl = url.startsWith("postgresql://") || url.startsWith("postgres://");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(isValidUrl ? { datasource: { url } } : {}),
});
