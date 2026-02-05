/**
 * Production server for Code Capsules (and any host with no separate build step).
 * Serves the built Next app and listens on PORT and 0.0.0.0 so the platform can reach it.
 * Run after: npm install && npm run build
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = "0.0.0.0";
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

console.log(`PORT=${process.env.PORT ?? 'not set'} -> listening on ${hostname}:${port}`);

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
