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

  // Ads sync: run on startup (catch up after restarts), then daily at ~06:00 UTC
  setTimeout(() => callLocal("/api/ads/sync"), 30 * 1000); // 30s after boot
  setInterval(() => {
    if (new Date().getUTCHours() === 6) {
      callLocal("/api/ads/sync");
    }
  }, 60 * 60 * 1000);

  // LinkedIn sync: run on startup, then daily at ~06:00 UTC
  setTimeout(() => callLocal("/api/linkedin/sync"), 60 * 1000); // 60s after boot
  setInterval(() => {
    if (new Date().getUTCHours() === 6) {
      callLocal("/api/linkedin/sync");
    }
  }, 60 * 60 * 1000);

  // Mailchimp sync: run on startup, then daily at ~06:00 UTC
  setTimeout(() => callLocal("/api/mailchimp/sync"), 90 * 1000); // 90s after boot
  setInterval(() => {
    if (new Date().getUTCHours() === 6) {
      callLocal("/api/mailchimp/sync");
    }
  }, 60 * 60 * 1000);

  // Microsoft Ads sync: run on startup, then daily at ~06:00 UTC
  setTimeout(() => callLocal("/api/microsoft-ads/sync"), 120 * 1000); // 120s after boot
  setInterval(() => {
    if (new Date().getUTCHours() === 6) {
      callLocal("/api/microsoft-ads/sync");
    }
  }, 60 * 60 * 1000);

  console.log("[cron] Scheduled: alerts (hourly), ads/linkedin/mailchimp/microsoft-ads sync (daily + startup)");
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
