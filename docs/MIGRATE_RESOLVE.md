# Fixing P3009: Failed migration in the database

When you see:

```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20260210120000_init_postgres` migration started at ... failed
```

Prisma has recorded that a migration **failed** (e.g. connection dropped or process killed mid-run). It will not run any migrations until you resolve that state.

## Option A: Database already has the tables (app was working before)

If your app was working and the tables (`User`, `Account`, `Session`, etc.) already exist in the DB, tell Prisma to treat the failed migration as **applied**:

```bash
DATABASE_URL="postgresql://postgres.xxx:PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres" \
  npx prisma migrate resolve --applied "20260210120000_init_postgres"
```

Then run migrations so any later ones (e.g. `add_ga_connected`) are applied:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

## Option B: Database is empty or migration never completed

If the tables do **not** exist (or you want to re-run the migration from scratch), mark it as **rolled back** so the next deploy will run it again:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate resolve --rolled-back "20260210120000_init_postgres"
```

Then:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Use the same pooler (Session mode) `DATABASE_URL` you use in production. Run these from your machine or a one-off script; do not run `prisma migrate deploy` in the container start command (see CODECAPSULES.md).
