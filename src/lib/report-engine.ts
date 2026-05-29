import puppeteer from "puppeteer";
import type { SlideDefinition, DataBinding } from "./report-types";

/**
 * Fill an HTML template with data by replacing {{placeholder}} tokens.
 */
export function fillTemplate(
  html: string,
  bindings: DataBinding[],
  resolvedData: Record<string, string>,
): string {
  let result = html;
  for (const b of bindings) {
    const value = resolvedData[b.placeholder] ?? "";
    result = result.replaceAll(`{{${b.placeholder}}}`, value);
  }
  // Also replace any remaining {{...}} with empty string
  result = result.replace(/\{\{[^}]+\}\}/g, "");
  return result;
}

/**
 * Wrap filled slide HTML pages into a single document for PDF rendering.
 * Each slide is a landscape page.
 */
function buildDocument(slideHtmlPages: string[]): string {
  const pages = slideHtmlPages
    .map(
      (html, i) => `
    <div class="slide" ${i > 0 ? 'style="page-break-before: always;"' : ""}>
      ${html}
    </div>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: 1280px 720px;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1280px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .slide {
    width: 1280px;
    height: 720px;
    overflow: hidden;
    position: relative;
    padding: 48px 56px;
  }
  /* Utility classes for slide templates */
  .text-muted { color: #888888; }
  .text-green { color: #00A352; }
  .text-red { color: #EF4444; }
  .text-amber { color: #F59E0B; }
  .bg-surface { background: #141414; }
  .bg-dark { background: #0A0A0A; }
  .border-subtle { border: 1px solid #2A2A2A; }
  .rounded { border-radius: 8px; }
  .tabular { font-variant-numeric: tabular-nums; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 10px 16px; text-align: left; }
  th { font-size: 11px; font-weight: 500; color: #888888; text-transform: uppercase; letter-spacing: 0.05em; }
  td { font-size: 13px; border-top: 1px solid #2A2A2A; }
  .progress-bar { height: 6px; border-radius: 999px; background: #2A2A2A; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 999px; }
  .card { background: #141414; border: 1px solid #2A2A2A; border-radius: 8px; padding: 20px; }
  .branding {
    position: absolute;
    bottom: 20px;
    right: 32px;
    font-size: 10px;
    color: #444444;
  }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}

/**
 * Render slide HTML pages into a PDF buffer using Puppeteer.
 */
export async function renderPdf(slideHtmlPages: string[]): Promise<Buffer> {
  const html = buildDocument(slideHtmlPages);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      width: "1280px",
      height: "720px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
