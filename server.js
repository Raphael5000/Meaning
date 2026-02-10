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

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });
  server.listen(port, hostname, () => {
    console.log("[server] Ready on http://%s:%s", hostname, port);
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
