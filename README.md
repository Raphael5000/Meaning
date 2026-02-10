# Meaning — Analytics Chat

Chat with your Google Analytics data using natural language. Connect your GA4 account and ask questions like "What are my top traffic sources?" or "How many users visited this week?"

## What’s in this repo

- **Local:** `npm run dev` (Next.js dev server).
- **Production (e.g. Code Capsules):** Run Command = `npm install && npm run build && node server.js`. No separate “build” step on the host; `server.js` is a small Node server that serves the built Next app and listens on `PORT` / `0.0.0.0`.

## Architecture

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS v4
- **Auth**: NextAuth v5 with Google OAuth (requesting `analytics.readonly` scope)
- **LLM**: Claude (Anthropic) with tool calling — the model decides which GA4 queries to run
- **Analytics**: Google Analytics Data API v1beta via the `googleapis` SDK

### How it works

1. User signs in with Google and grants read-only access to their Analytics.
2. User selects a GA4 property from the dropdown.
3. User asks a question in the chat interface.
4. The backend sends the question to Claude along with GA4 tool definitions (`run_report`, `run_realtime_report`, `get_metadata`).
5. Claude decides which tools to call and with what parameters.
6. The backend executes the GA4 API calls using the user's OAuth token and returns results to Claude.
7. Claude interprets the data and responds with insights in plain English.

## Setup

### 1. Google Cloud Console

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable these APIs:
   - **Google Analytics Data API**
   - **Google Analytics Admin API**
3. Go to **APIs & Services > Credentials** and create an **OAuth 2.0 Client ID** (Web application)
4. Add **both** redirect URIs (local and prod) so OAuth works everywhere:
   - **Local:** `http://localhost:3001/api/auth/callback/google`
   - **Prod:** e.g. `https://your-app.usemeaning.io/api/auth/callback/google`
5. (Optional) Under **Authorized JavaScript origins**, add `http://localhost:3001` for local.
6. Copy the Client ID and Client Secret.

### 2. Environment Variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
AUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3001
# Required for OAuth and account creation (NextAuth + Prisma).
# Local: use a Supabase project (free tier) or local Postgres — see "Local development with Supabase" below.
DATABASE_URL="postgresql://..."
```

### 3. Local development with Supabase (OAuth)

After moving prod to Supabase, local needs a Postgres DB and the right Google redirect URI.

1. **Database for local** (pick one):
   - **Option A — Same Supabase project as prod:** Use your prod `DATABASE_URL` in `.env`. Easiest; local and prod share the same DB (fine for solo dev; be careful with data).
   - **Option B — Separate Supabase project for dev:** Create a second Supabase project (free tier), get its connection string from **Project Settings → Database → Connection string (URI)**, put it in `.env` as `DATABASE_URL`, then run:
     ```bash
     npx prisma migrate deploy
     ```
     so the schema is applied to the dev DB.

2. **`.env` for local:** Ensure:
   - `NEXTAUTH_URL=http://localhost:3001`
   - `DATABASE_URL` = one of the options above
   - `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` set (same Google OAuth client as prod is fine).

3. **Google OAuth:** In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials** → your OAuth 2.0 client:
   - **Authorized redirect URIs:** add `http://localhost:3001/api/auth/callback/google` (in addition to your prod callback URL).
   - Save. Without this, Google will return `redirect_uri_mismatch` when signing in locally.

After that, `npm run dev` and sign in with Google at http://localhost:3001; the callback will hit localhost and NextAuth will use your local `DATABASE_URL` to create/find the user.

### 4. Install & Run

```bash
cp .env.example .env
# Edit .env and add your values (see above). For a quick local test, at minimum set AUTH_SECRET to any non-empty string.
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Sign in with Google (needs real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and the local redirect URI in Google Console), select a GA4 property, and start chatting. Chat requires a valid `ANTHROPIC_API_KEY`. OAuth requires a valid `DATABASE_URL` (see "Local development with Supabase" above).

### Deploy on Code Capsules

This repo is set up for **Code Capsules** (no separate build phase there, so install + build + start happen in one Run Command).

| Where        | How you run it |
|-------------|----------------|
| **Local**   | `npm run dev` (Next.js dev server). |
| **Code Capsules** | Run Command: `npm install && npm run build && node server.js`. The custom `server.js` listens on `PORT` and `0.0.0.0` so the capsule can reach it. |

1. **Create a Backend Capsule** and connect this GitHub repo.

2. **Capsule Parameters** (Config tab → Edit Capsule Parameters):
   - Code Capsules has no separate build step, so use the **Run Command** to install, build, and start in one go. Set **Run Command** to:
     ```bash
     npm install && npm run build && node server.js
     ```
   - **Network Port**: `3000` (default).

3. **Environment variables** (Config tab): add the same as in Setup, with production values:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `ANTHROPIC_API_KEY`
   - `AUTH_SECRET` (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL` = your capsule URL, e.g. `https://<your-capsule>.codecapsules.space`

4. **Google Cloud Console** → your OAuth 2.0 client → add authorized redirect URI:  
   `https://<your-capsule>.codecapsules.space/api/auth/callback/google`

5. Redeploy. The run command installs deps, builds the app, then starts the custom server so the app listens on Code Capsules’ port and is reachable.

**If you see "Service Unavailable" (503):**

- Open the capsule **Logs** tab (runtime logs, not build logs) and check for errors when the app starts or when you open the site. Common causes:
  - **Missing env vars**: `AUTH_SECRET` and `NEXTAUTH_URL` must be set; without them the app can crash on requests.
  - **Wrong port**: In Capsule Parameters, **Network Port** should be `3000` so it matches what the app uses.
- You can ping the health endpoint to confirm the process is up: `https://<your-capsule>.codecapsules.space/api/health` (should return `{"ok":true}`).

**Why won’t it deploy?**

1. **Run Command not set** — Code Capsules doesn’t have a separate “build” step. If Run Command is blank, it may only run `npm start`, so the app never runs `npm run build` and there’s no `.next` folder → 502. **Fix:** Set Run Command to `npm install && npm run build && node server.js`.
2. **Wrong port** — Capsule Parameters → Network Port must be `3000` so it matches what `server.js` uses (`process.env.PORT` or 3000).
3. **Missing env vars** — `AUTH_SECRET` and `NEXTAUTH_URL` must be set or the app can crash. Add all variables from the table above.
4. **Check runtime logs** — In the capsule’s **Logs** tab (not the build log), look for errors when the app starts or when you open the site. You should see `> Ready on http://0.0.0.0:3000`; if not, the log will show the failure.

See **[CODECAPSULES.md](./CODECAPSULES.md)** for a step-by-step deployment checklist.

## GA4 Tools Available to the LLM

| Tool | Description |
|------|-------------|
| `run_report` | Query historical data — metrics, dimensions, date ranges, sorting |
| `run_realtime_report` | Real-time data from the last 30 minutes |
| `get_metadata` | Discover available metrics and dimensions for the property |

## Example Questions

- "How many active users did I have this month?"
- "What are my top 10 pages by views?"
- "Where is my traffic coming from?"
- "Compare this week's sessions to last week"
- "What devices do my users use?"
- "Who is on my site right now?"
- "What's my bounce rate trend over the last 30 days?"
