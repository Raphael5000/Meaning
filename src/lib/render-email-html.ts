import type { EmailPayload, PreviewKpiData, PreviewMover } from "./email-payload";

/**
 * Render an EmailPayload to email-safe HTML. Mirrors the visual structure of
 * the React `<EmailPreview />` component so what users see in the preview
 * matches what lands in their inbox.
 *
 * Email constraints:
 * - All styles inline (no <style> tags — many clients strip them)
 * - Tables for layout (Outlook's HTML engine doesn't grok flexbox/grid)
 * - No CSS variables — hardcoded hex values
 * - SVG sparkline with hardcoded stroke colors (modern clients render it;
 *   older Outlook will see a blank gap, which is acceptable)
 *
 * Design colors are pulled from `tokens-v2.css` and converted to hex for
 * the most-rendered clients. Light mode by default — email clients can't
 * read the user's system theme reliably.
 */

const COLORS = {
  surface: "#FFFFFF",
  surface2: "#F4F6F4",
  bg: "#FAFBF9",
  ink: "#181A18",
  inkMuted: "#6B7570",
  inkSubtle: "#A9B0AB",
  line: "#DAE0DC",
  brand: "#00A352",
  brandVivid: "#00EE7F",
  pos: "#067647",
  neg: "#B42318",
};

const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSparkline(points: number[], color: string): string {
  if (!points || points.length < 2) return "";
  const w = 440;
  const h = 70;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const norm = (v: number) => h - ((v - min) / range) * (h - 6) - 3;
  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${norm(v).toFixed(1)}`)
    .join(" ");
  // Area-fill path
  const area =
    `${path} L${w},${h} L0,${h} Z`;
  // Last-point dot
  const lastX = (points.length - 1) * step;
  const lastY = norm(points[points.length - 1]);
  return `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <path d="${area}" fill="${color}" fill-opacity="0.12" stroke="none" />
  <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3" fill="${color}" stroke="${COLORS.surface}" stroke-width="1.5" />
</svg>`.trim();
}

function kpiCell(k: PreviewKpiData): string {
  const neg = k.change.startsWith("-") && !k.change.includes("pt");
  const deltaColor = neg ? COLORS.neg : COLORS.pos;
  return `
<td style="padding:8px 4px; vertical-align:top;">
  <div style="font-family:${FONT_SANS}; font-size:9px; font-weight:600; letter-spacing:0.09em; text-transform:uppercase; color:${COLORS.inkMuted}; margin-bottom:3px;">${escapeHtml(k.label)}</div>
  <div style="font-family:${FONT_SANS}; font-size:15px; font-weight:600; letter-spacing:-0.01em; color:${COLORS.ink}; line-height:1.2; font-variant-numeric:tabular-nums;">${escapeHtml(k.value)}</div>
  <div style="font-family:${FONT_SANS}; font-size:10px; color:${deltaColor}; margin-top:1px; font-variant-numeric:tabular-nums;">${escapeHtml(k.change)}</div>
</td>`.trim();
}

function moverRow(m: PreviewMover): string {
  const neg = m.delta.startsWith("-");
  const deltaColor = neg ? COLORS.neg : COLORS.pos;
  return `
<tr>
  <td style="padding:4px 0; font-family:${FONT_MONO}; font-size:11.5px; color:${COLORS.ink};">${escapeHtml(m.page)}</td>
  <td style="padding:4px 0; font-family:${FONT_SANS}; font-size:11.5px; color:${COLORS.ink}; text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; padding-left:8px;">${escapeHtml(m.value)}</td>
  <td style="padding:4px 0; font-family:${FONT_SANS}; font-size:11.5px; color:${deltaColor}; text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; padding-left:8px; width:50px;">${escapeHtml(m.delta)}</td>
</tr>`.trim();
}

interface RenderArgs {
  payload: EmailPayload;
  /** "Open in Meaning" CTA URL — defaults to the production app */
  appUrl?: string;
  isTest?: boolean;
}

export function renderEmailHtml({ payload, appUrl, isTest = false }: RenderArgs): string {
  const url = appUrl || "https://usemeaning.io";
  const trendColor = COLORS.brand;
  const sparkline =
    payload.trendPoints && payload.trendPoints.length > 1
      ? renderSparkline(payload.trendPoints, trendColor)
      : "";
  const trendLabel = payload.trendLabel ?? "Trend · last period";

  const testBanner = isTest
    ? `
<div style="background:#FFF8E1; border:1px solid #FFD24D; border-radius:8px; padding:10px 14px; margin:0 0 16px; font-family:${FONT_SANS}; font-size:12.5px; color:#7A5400; font-weight:500;">
  This is a test email. No action is needed.
</div>`.trim()
    : "";

  const kpiCells = payload.kpis.slice(0, 4).map(kpiCell).join("");
  const kpisRow = kpiCells
    ? `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%; margin:18px 0; border-top:1px solid ${COLORS.line}; border-bottom:1px solid ${COLORS.line}; padding:6px 0; border-collapse:collapse;">
  <tr>${kpiCells}</tr>
</table>`.trim()
    : "";

  const moversBlock =
    payload.movers && payload.movers.length > 0
      ? `
<div style="margin-top:16px;">
  <div style="font-family:${FONT_SANS}; font-size:10px; font-weight:600; letter-spacing:0.09em; text-transform:uppercase; color:${COLORS.inkMuted}; margin-bottom:8px;">Top movers</div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse;">
    ${payload.movers.map(moverRow).join("")}
  </table>
</div>`.trim()
      : "";

  const sparklineBlock = sparkline
    ? `
<div style="margin-top:16px;">
  <div style="font-family:${FONT_SANS}; font-size:10px; font-weight:600; letter-spacing:0.09em; text-transform:uppercase; color:${COLORS.inkMuted}; margin-bottom:6px;">${escapeHtml(trendLabel)}</div>
  <div style="padding:8px; border:1px solid ${COLORS.line}; border-radius:8px; background:${COLORS.bg};">
    ${sparkline}
  </div>
</div>`.trim()
    : "";

  const weekTag = payload.weekLabel
    ? `<span style="font-family:${FONT_SANS}; font-size:10px; font-weight:600; letter-spacing:0.09em; text-transform:uppercase; color:${COLORS.inkMuted};">${escapeHtml(payload.weekLabel)}</span>`
    : "";

  return `
<div style="background:${COLORS.surface2}; padding:32px 16px; font-family:${FONT_SANS};">
  ${testBanner}
  <div style="max-width:560px; margin:0 auto;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:${COLORS.surface}; border:1px solid ${COLORS.line}; border-radius:14px; box-shadow:0 1px 0 rgba(0,0,0,0.04); border-collapse:separate;">
      <tr>
        <td style="padding:14px 18px; border-bottom:1px solid ${COLORS.line};">
          <div style="font-family:${FONT_MONO}; font-size:11px; color:${COLORS.inkMuted}; line-height:1.6;">
            <div>From  Meaning &lt;alerts@usemeaning.io&gt;</div>
            <div style="color:${COLORS.ink};">Subject  ${escapeHtml(payload.subject)}</div>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 28px 28px;">
          <div style="display:block; margin-bottom:18px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="vertical-align:middle;">
                  <span style="display:inline-block; vertical-align:middle; width:18px; height:18px; background:${COLORS.brand}; border-radius:5px; margin-right:8px;"></span>
                  <span style="display:inline-block; vertical-align:middle; font-family:${FONT_SANS}; font-size:13px; font-weight:600; color:${COLORS.ink};">Meaning</span>
                </td>
                <td style="text-align:right; vertical-align:middle;">${weekTag}</td>
              </tr>
            </table>
          </div>

          <h2 style="margin:0 0 8px; font-family:${FONT_SANS}; font-size:22px; font-weight:600; letter-spacing:-0.02em; color:${COLORS.ink}; line-height:1.25;">
            ${escapeHtml(payload.headline)}
          </h2>
          <p style="margin:0; font-family:${FONT_SANS}; font-size:13px; color:${COLORS.inkMuted}; line-height:1.55;">
            ${escapeHtml(payload.lede)}
          </p>

          ${kpisRow}

          ${sparklineBlock}

          ${moversBlock}

          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%; margin-top:22px; padding-top:16px; border-top:1px solid ${COLORS.line}; border-collapse:collapse;">
            <tr>
              <td>
                <a href="${url}" style="display:inline-block; padding:8px 14px; background:${COLORS.ink}; color:${COLORS.surface}; text-decoration:none; border-radius:8px; font-family:${FONT_SANS}; font-size:12.5px; font-weight:600;">Open in Meaning</a>
              </td>
              <td style="text-align:right;">
                <a href="${url}/account" style="font-family:${FONT_MONO}; font-size:10px; color:${COLORS.inkSubtle}; text-decoration:none;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <div style="text-align:center; margin-top:14px; font-family:${FONT_SANS}; font-size:11px; color:${COLORS.inkSubtle};">
      Sent by Meaning · You're receiving this because someone set up an alert.
    </div>
  </div>
</div>`.trim();
}
