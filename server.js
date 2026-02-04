const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = "0.0.0.0";
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

console.log(`Starting server on ${hostname}:${port}...`);

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
