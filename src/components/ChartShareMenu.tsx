"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Linkedin, Share2, MessageSquare } from "lucide-react";

interface LegendEntry {
  name: string;
  value: number;
  color: string;
}

interface ChartShareMenuProps {
  getDataURL: () => string | null;
  legendData?: LegendEntry[] | null;
  legendMetricLabel?: string;
}

const PADDING = 60;
const BORDER_RADIUS = 24;
const LOGO_HEIGHT = 24;
const WATERMARK_MARGIN = 16;

/** Render a professional styled image from the raw chart PNG */
async function createStyledImage(
  rawDataURL: string,
  legendData?: LegendEntry[] | null,
  legendMetricLabel?: string
): Promise<string> {
  const chartImg = await loadImage(rawDataURL);

  // If we have legend data, allocate space for the table on the right
  const TABLE_COL_W = 380;
  const TABLE_ROW_H = 48;
  const TABLE_HEADER_H = 42;
  const TABLE_PADDING = 24;
  const hasTable = legendData && legendData.length > 0;
  const tableHeight = hasTable ? TABLE_HEADER_H + legendData.length * TABLE_ROW_H + TABLE_ROW_H + TABLE_PADDING * 2 : 0;

  const chartAreaW = chartImg.width;
  const extraW = hasTable ? TABLE_COL_W + 40 : 0;
  const width = chartAreaW + extraW + PADDING * 2;
  const minH = hasTable ? Math.max(chartImg.height, tableHeight) : chartImg.height;
  const height = minH + PADDING * 2 + LOGO_HEIGHT + WATERMARK_MARGIN;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#0f1117");
  grad.addColorStop(0.5, "#151921");
  grad.addColorStop(1, "#0d2e23");
  ctx.fillStyle = grad;

  // Rounded rect background
  roundRect(ctx, 0, 0, width, height, BORDER_RADIUS);
  ctx.fill();

  // Subtle inner border
  ctx.strokeStyle = "rgba(16, 163, 127, 0.25)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 0.75, 0.75, width - 1.5, height - 1.5, BORDER_RADIUS);
  ctx.stroke();

  // Chart image
  ctx.drawImage(chartImg, PADDING, PADDING);

  // Draw table legend if present
  if (hasTable && legendData) {
    const total = legendData.reduce((sum, d) => sum + d.value, 0);
    const tableX = PADDING + chartAreaW + 20;
    const tableY = height - PADDING - LOGO_HEIGHT - WATERMARK_MARGIN - tableHeight + TABLE_PADDING;
    const metricLabel = legendMetricLabel || "Value";

    // Table background
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    roundRect(ctx, tableX, tableY, TABLE_COL_W, tableHeight - TABLE_PADDING, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    roundRect(ctx, tableX, tableY, TABLE_COL_W, tableHeight - TABLE_PADDING, 10);
    ctx.stroke();

    // Header
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "600 13px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("CHANNEL", tableX + 16, tableY + TABLE_HEADER_H / 2);
    ctx.textAlign = "right";
    ctx.fillText(metricLabel.toUpperCase(), tableX + TABLE_COL_W - 110, tableY + TABLE_HEADER_H / 2);
    ctx.fillText("SHARE", tableX + TABLE_COL_W - 16, tableY + TABLE_HEADER_H / 2);

    // Header divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(tableX, tableY + TABLE_HEADER_H);
    ctx.lineTo(tableX + TABLE_COL_W, tableY + TABLE_HEADER_H);
    ctx.stroke();

    // Rows
    legendData.forEach((d, i) => {
      const rowY = tableY + TABLE_HEADER_H + i * TABLE_ROW_H;

      // Row divider
      if (i > 0) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.beginPath();
        ctx.moveTo(tableX, rowY);
        ctx.lineTo(tableX + TABLE_COL_W, rowY);
        ctx.stroke();
      }

      // Color dot
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(tableX + 24, rowY + TABLE_ROW_H / 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Name
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "400 16px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(d.name, tableX + 42, rowY + TABLE_ROW_H / 2);

      // Value
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.textAlign = "right";
      ctx.fillText(d.value.toLocaleString(), tableX + TABLE_COL_W - 110, rowY + TABLE_ROW_H / 2);

      // Share
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) + "%" : "0%";
      ctx.fillText(pct, tableX + TABLE_COL_W - 16, rowY + TABLE_ROW_H / 2);
    });

    // Total row
    const totalRowY = tableY + TABLE_HEADER_H + legendData.length * TABLE_ROW_H;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(tableX, totalRowY);
    ctx.lineTo(tableX + TABLE_COL_W, totalRowY);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "600 16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Total", tableX + 16, totalRowY + TABLE_ROW_H / 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.textAlign = "right";
    ctx.fillText(total.toLocaleString(), tableX + TABLE_COL_W - 110, totalRowY + TABLE_ROW_H / 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText("100%", tableX + TABLE_COL_W - 16, totalRowY + TABLE_ROW_H / 2);
  }

  // Watermark text
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "500 13px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    "usemeaning.io",
    width - PADDING,
    height - WATERMARK_MARGIN
  );

  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function downloadBlob(dataURL: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataURL;
  link.click();
}

const SHARE_TEXT = "Check out this analytics insight from Meaning — the AI chatbot for Google Analytics.";
const SHARE_URL = "https://usemeaning.io";

// X (Twitter) logo SVG as a component
function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function ChartShareMenu({ getDataURL, legendData, legendMetricLabel }: ChartShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function getStyledImage(): Promise<string | null> {
    const raw = getDataURL();
    if (!raw) return null;
    setGenerating(true);
    try {
      return await createStyledImage(raw, legendData, legendMetricLabel);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    const img = await getStyledImage();
    if (img) downloadBlob(img, "meaning-chart.png");
    setOpen(false);
  }

  async function handleShareLinkedIn() {
    // Download the image so the user can attach it
    const img = await getStyledImage();
    if (img) downloadBlob(img, "meaning-chart.png");
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  }

  async function handleShareX() {
    const img = await getStyledImage();
    if (img) downloadBlob(img, "meaning-chart.png");
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  }

  async function handleShareSlack() {
    const img = await getStyledImage();
    if (img) downloadBlob(img, "meaning-chart.png");
    // Slack doesn't have a web share URL — download image and open Slack
    window.open("https://slack.com/open", "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-accent"
        style={{ color: "var(--text-muted)" }}
        aria-label="Share chart"
      >
        <Share2 className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          <button
            type="button"
            onClick={handleDownload}
            disabled={generating}
            className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Download className="h-4 w-4 shrink-0" />
            Download Image
          </button>
          <button
            type="button"
            onClick={handleShareLinkedIn}
            disabled={generating}
            className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Linkedin className="h-4 w-4 shrink-0" />
            Share to LinkedIn
          </button>
          <button
            type="button"
            onClick={handleShareX}
            disabled={generating}
            className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <XLogo className="h-4 w-4 shrink-0" />
            Share to X
          </button>
          <button
            type="button"
            onClick={handleShareSlack}
            disabled={generating}
            className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            Share to Slack
          </button>
        </div>
      )}
    </div>
  );
}
