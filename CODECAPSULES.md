# Deploy Meaning on Code Capsules

Use this as a checklist. Code Capsules has **no separate build step**—everything happens in the **Run Command**.

## 1. Create the capsule

- **Capsule type:** Backend Capsule  
- Connect this GitHub repo  
- **Run Command:** leave blank at first if you want; we’ll set it in Config

## 2. Config → Capsule Parameters (Edit)

| Field           | Value |
|----------------|--------|
| **Run Command** | `npm install && npm run build && node server.js` |
| **Network Port**| `3000` |

You **must** set Run Command to the line above. If it’s blank, Code Capsules may only run `npm start` and never build, so you get a bad gateway (502).

## 3. Config → Environment variables

Add these (use your real values and your capsule URL):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ANTHROPIC_API_KEY`
- `AUTH_SECRET` — e.g. run `openssl rand -base64 32` and paste the output
- `NEXTAUTH_URL` — your app URL, e.g. `https://<your-capsule>.codecapsules.space`

Save.

## 4. Google Cloud Console

- Open your OAuth 2.0 client used for this app  
- **Authorized redirect URIs:** add  
  `https://<your-capsule>.codecapsules.space/api/auth/callback/google`  
  (replace with your real capsule URL)

## 5. Redeploy

Trigger a new deploy (e.g. push a commit or use “Redeploy” in Code Capsules). Wait for the build to finish.

## 6. If it still doesn’t work

- Open the capsule **Logs** tab (runtime logs, not the build log).
- Reproduce the issue (open the site), then check the logs for errors.
- Confirm you see: `> Ready on http://0.0.0.0:3000` (or the port Code Capsules uses). If that line never appears, the server isn’t starting—the log will show why (e.g. missing env, build failure, crash).
- Test the health route: `https://<your-capsule>.codecapsules.space/api/health`  
  If you get `{"ok":true}`, the app is running and the problem is likely auth or another route.
