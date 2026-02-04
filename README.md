Hello!

# Meaning — Analytics Chat

Chat with your Google Analytics data using natural language. Connect your GA4 account and ask questions like "What are my top traffic sources?" or "How many users visited this week?"

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
4. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
5. Copy the Client ID and Client Secret

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
NEXTAUTH_URL=http://localhost:3000
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with Google, select a GA4 property, and start chatting.

### Deploy on Code Capsules

This app is set up for **Code Capsules** only (no Google Cloud / buildpacks).

1. **Create a Backend Capsule** and connect this GitHub repo.

2. **Capsule Parameters** (Config tab → Edit Capsule Parameters):
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: leave **blank** (uses `Procfile` → `npm run start`; Next listens on `PORT` or 3000 and `0.0.0.0`).
   - **Network Port**: `3000` (default).

3. **Environment variables** (Config tab): add the same as in Setup, with production values:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `ANTHROPIC_API_KEY`
   - `AUTH_SECRET` (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL` = your capsule URL, e.g. `https://<your-capsule>.codecapsules.space`

4. **Google Cloud Console** → your OAuth 2.0 client → add authorized redirect URI:  
   `https://<your-capsule>.codecapsules.space/api/auth/callback/google`

5. Redeploy. The `Procfile` runs `npm run start` so the app is reachable by Code Capsules.

**If you see "Service Unavailable" (503):**

- Open the capsule **Logs** tab (runtime logs, not build logs) and check for errors when the app starts or when you open the site. Common causes:
  - **Missing env vars**: `AUTH_SECRET` and `NEXTAUTH_URL` must be set; without them the app can crash on requests.
  - **Wrong port**: In Capsule Parameters, **Network Port** should be `3000` so it matches what the app uses.
- You can ping the health endpoint to confirm the process is up: `https://<your-capsule>.codecapsules.space/api/health` (should return `{"ok":true}`).

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
