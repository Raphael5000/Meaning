/**
 * Production server. Serves the built Next app on PORT and 0.0.0.0.
 * Run after: npm install && npm run build
 * Start: node server.js (or use Procfile: web: node server.js)
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = "0.0.0.0";
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

console.log("[server] PORT=%s (from env: %s), binding to %s:%s", port, process.env.PORT ?? "unset", hostname, port);

// ---------------------------------------------------------------------------
// Built-in cron jobs
// ---------------------------------------------------------------------------

function callLocal(path, method = "POST") {
  const url = `http://localhost:${port}${path}`;
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.log("[cron] Skipping %s — CRON_SECRET not set", path);
    return;
  }
  console.log("[cron] Calling %s %s", method, path);
  fetch(url, {
    method,
    headers: { Authorization: `Bearer ${secret}` },
  })
    .then(async (res) => {
      const body = await res.text();
      console.log("[cron] %s → %s %s", path, res.status, body.slice(0, 200));
    })
    .catch((err) => {
      console.error("[cron] %s failed:", path, err.message);
    });
}

function startCronJobs() {
  // Alerts: check every hour
  setInterval(() => callLocal("/api/alerts/send"), 60 * 60 * 1000);

  // ── Data syncs: run on startup (staggered), then daily at 06:00 UTC ──
  // Each sync now has a 16-day window and 1 retry built in.

  setTimeout(() => callLocal("/api/ads/sync"), 30 * 1000);
  setTimeout(() => callLocal("/api/linkedin/sync"), 60 * 1000);
  setTimeout(() => callLocal("/api/mailchimp/sync"), 90 * 1000);
  setTimeout(() => callLocal("/api/microsoft-ads/sync"), 120 * 1000);
  setTimeout(() => callLocal("/api/gsc/sync"), 150 * 1000);
  setTimeout(() => callLocal("/api/ahrefs/sync"), 180 * 1000);
  setTimeout(() => callLocal("/api/attio/sync"), 210 * 1000);
  setTimeout(() => callLocal("/api/reddit/sync"), 240 * 1000);

  // Exchange rates: sync on startup + daily (must run before data syncs)
  setTimeout(() => callLocal("/api/exchange-rates/sync"), 10 * 1000);

  // Daily sync at 06:00 UTC
  setInterval(() => {
    if (new Date().getUTCHours() === 6) {
      callLocal("/api/exchange-rates/sync");
      callLocal("/api/ads/sync");
      callLocal("/api/gsc/sync");
      callLocal("/api/linkedin/sync");
      callLocal("/api/mailchimp/sync");
      callLocal("/api/microsoft-ads/sync");
      callLocal("/api/ahrefs/sync");
      callLocal("/api/attio/sync");
      callLocal("/api/reddit/sync");
    }
  }, 60 * 60 * 1000);

  // Daily dedup at 08:00 UTC — cleans any duplicates from concurrent syncs
  setInterval(() => {
    if (new Date().getUTCHours() === 8) {
      callLocal("/api/dedup");
    }
  }, 60 * 60 * 1000);

  // Retry window at 12:00 UTC — catches anything that failed at 06:00
  setInterval(() => {
    if (new Date().getUTCHours() === 12) {
      callLocal("/api/exchange-rates/sync");
      callLocal("/api/ads/sync");
      callLocal("/api/gsc/sync");
      callLocal("/api/linkedin/sync");
      callLocal("/api/mailchimp/sync");
      callLocal("/api/microsoft-ads/sync");
      callLocal("/api/ahrefs/sync");
      callLocal("/api/attio/sync");
      callLocal("/api/reddit/sync");
    }
  }, 60 * 60 * 1000);

  console.log("[cron] Scheduled: alerts (hourly), all syncs (daily 06:00 + retry 12:00 UTC + startup)");
}

// ---------------------------------------------------------------------------

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });
  server.listen(port, hostname, () => {
    console.log("[server] Ready on http://%s:%s", hostname, port);
    startCronJobs();
  });
  server.on("error", (err) => {
    console.error("[server] Listen error:", err.message || err);
    process.exit(1);
  });
}).catch((err) => {
  console.error("[server] Failed to start (check .next exists and Run Command included 'npm run build'):", err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
