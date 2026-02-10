# Deploy Meaning on Code Capsules

Use this as a checklist. Code Capsules has **no separate build step**—everything happens in the **Run Command**.

## 1. Create the capsule

- **Capsule type:** Backend Capsule  
- Connect this GitHub repo  
- **Run Command:** leave blank at first if you want; we’ll set it in Config

## 2. Config → Capsule Parameters (Edit)

| Field           | Value |
|----------------|--------|
| **Run Command** | `npm install && npm run build && npx prisma migrate deploy && node server.js` |
| **Network Port**| `3000` |

You **must** include `npm run build` in the Run Command. Without it the app has no production build and will crash or return 503 Service Unavailable. Use the full command above so install, build, migrations, and start all run on each deploy.

## 3. Config → Environment variables

**Required for the app:**

Add these (use your real values and your capsule URL):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ANTHROPIC_API_KEY`
- `AUTH_SECRET` — e.g. run `openssl rand -base64 32` and paste the output
- `NEXTAUTH_URL` — your app URL, e.g. `https://<your-capsule>.codecapsules.space` (Code Capsules also sets `APP_URL` automatically; you can use that value here)
- `DATABASE_URL` — **required for OAuth/account creation** (fixes 502 after Google sign-in). Use your **Supabase** Postgres connection string:
  - In Supabase: Project Settings → Database → Connection string → **URI** (use the direct connection, e.g. `postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres`, or the Session-mode URI from the Supabase dashboard).
  - Replace `[YOUR-PASSWORD]` with your database password. If you use the pooler (port 6543), use **Session mode** for Prisma.
  - Run migrations once against this DB (from your machine): `DATABASE_URL="postgresql://..." npx prisma migrate deploy`

**If the build stops at “Creating an optimized production build…” with no error:**

The process is likely being killed by a **timeout** or **out of memory**. Add this so the build has more memory and a chance to finish:

- `NODE_OPTIONS` — set to `--max-old-space-size=2048` (or `3072` if you have headroom)

If Code Capsules has a **build** or **run timeout** (e.g. in Config or capsule settings), increase it to at least **10 minutes** so the Next.js production build can complete.

Save.

## 4. Google Cloud Console

- Open your OAuth 2.0 client used for this app  
- **Authorized redirect URIs:** add both (replace with your real URLs):
  - `https://<your-capsule>.codecapsules.space/api/auth/callback/google`
  - `https://<your-capsule>.codecapsules.space/api/auth/connect-google/callback`

## 5. Redeploy

Trigger a new deploy (e.g. push a commit or use “Redeploy” in Code Capsules). Wait for the build to finish.

## 6. Build still stops after upgrading?

Some hosts use a separate build environment (fixed RAM/CPU) that is not upgraded with your capsule. Wait 4-5 minutes and scroll to the very end of the build log; look for `Build finished OK` or an error. Ask Code Capsules if the build step has its own memory/timeout limits.

## 7. Service Unavailable (503) or Bad Gateway

- **Run Command must include the build.** If it only has `node server.js` (or `npx prisma migrate deploy && node server.js`), the app has no `.next` build and will crash. Set it to:  
  `npm install && npm run build && npx prisma migrate deploy && node server.js`
- **Network Port** must match: set to `3000` in Capsule Parameters (server.js uses `process.env.PORT` or 3000).
- **Logs** (runtime **Logs** tab): look for `> Ready on http://0.0.0.0:3000`. If that never appears, the process is crashing—check for missing env (`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`) or Prisma/Node errors.
- Test: `https://<your-capsule>.codecapsules.space/api/health` → should return `{"ok":true}`.

## 8. If it still doesn’t work

- Open the capsule **Logs** tab (runtime logs, not the build log).
- Reproduce the issue (open the site), then check the logs for errors.
- Confirm you see: `> Ready on http://0.0.0.0:3000` (or the port Code Capsules uses). If that line never appears, the server isn’t starting—the log will show why (e.g. missing env, build failure, crash).
- Test the health route: `https://<your-capsule>.codecapsules.space/api/health`  
  If you get `{"ok":true}`, the app is running and the problem is likely auth or another route.

---

## From Code Capsules docs – optional / good to know

- **Project path** — In Config → Capsule Parameters, **Project Path** defaults to `/`. Only change it if your app lives in a subdirectory of the repo.
- **APP_URL** — Code Capsules automatically sets an `APP_URL` env var to your capsule’s public URL. You don’t need to create it; use it (or the same value) for `NEXTAUTH_URL` and in Google OAuth redirect URIs.
- **Procfile vs Run Command** — We use a **Procfile** in the repo and also document setting **Run Command** in the UI. Per [Code Capsules](https://docs.codecapsules.io/products/backend-capsule/add-procfile): Procfiles are optional; you can instead set build/run commands in the UI. If both exist, keep them in sync (same install + build + start) so behavior is consistent.
- **Custom domain** — In the capsule’s **Domains** tab you can add a custom domain (e.g. `app.yourdomain.com`). You’ll get a static IP and add an A record (root) or CNAME (subdomain). **After adding a custom domain you must:** (1) set `NEXTAUTH_URL` to that URL (e.g. `https://app.yourdomain.com`) in Config → Environment variables, and (2) in Google Cloud Console → your OAuth client → **Authorized redirect URIs**, add `https://app.yourdomain.com/api/auth/callback/google`. Otherwise you’ll get `redirect_uri_mismatch` when signing in via the custom domain. See [Add and Remove Custom Domains](https://docs.codecapsules.io/platform/capsules/how-to-add-a-custom-domain).
- **HTTP Basic Auth** — For staging or preview protection, use **Domains** → **Basic Auth** and enable it; credentials appear in the same section. See [HTTP Basic Authentication](https://docs.codecapsules.io/platform/security/basic-auth).
- **Monitor & Alerting** — In the **Monitor** and **Alerting** tabs you can track metrics and set up alerts (e.g. downtime or errors).
- **Build vs runtime logs** — **Build and Deploy** shows the build log (install + build). The **Logs** tab is for the running app; use that to debug startup or request errors.
