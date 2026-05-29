import PptxGenJS from "pptxgenjs";
import type { SlideDefinition, ScorecardRowConfig, ChannelTableConfig, GoalsGridConfig, ChartSlideConfig, AiInsightsConfig } from "./report-types";

/* ──────────────────────────────────────────────
   Theme / branding
   ──────────────────────────────────────────────*/

const THEME = {
  bg: "0A0A0A",
  surface: "141414",
  text: "FFFFFF",
  textMuted: "888888",
  primary: "00A352",
  danger: "EF4444",
  amber: "F59E0B",
  border: "2A2A2A",
  fontFace: "Helvetica Neue",
};

function applyMaster(pptx: PptxGenJS) {
  pptx.layout = "LAYOUT_16x9";
  pptx.defineSlideMaster({
    title: "MEANING",
    background: { color: THEME.bg },
    objects: [
      // Subtle bottom-right branding
      {
        text: {
          text: "Meaning",
          options: {
            x: 8.5, y: 5.1, w: 1.5, h: 0.3,
            fontSize: 9, color: THEME.textMuted, fontFace: THEME.fontFace,
            align: "right",
          },
        },
      },
    ],
  });
}

/* ──────────────────────────────────────────────
   Data types passed into the engine
   ──────────────────────────────────────────────*/

export interface ReportData {
  orgName: string;
  period: string; // e.g. "May 2026"
  displayCurrency: string;
  scorecards: Record<string, { value: number; prevValue?: number; format: string }>;
  channelData: Record<string, { metrics: Record<string, { current: number; previous: number; format: string }> }>;
  goals: { name: string; value: number | null; target: number; direction: string; displayFormat: string }[];
  manualMetrics: { name: string; entries: { period: string; value: number }[] }[];
  aiInsights?: string;
}

/* ──────────────────────────────────────────────
   Slide renderers
   ──────────────────────────────────────────────*/

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+∞%" : "0%";
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function pctColor(current: number, previous: number, invert = false): string {
  const better = invert ? current < previous : current > previous;
  if (current === previous) return THEME.textMuted;
  return better ? THEME.primary : THEME.danger;
}

function fmtVal(value: number, format: string, currency = "R"): string {
  switch (format) {
    case "percentage":
      return `${(value * 100).toFixed(1)}%`;
    case "currency":
      return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    default:
      return value.toLocaleString();
  }
}

function renderTitle(slide: PptxGenJS.Slide, def: SlideDefinition, data: ReportData) {
  slide.addText(data.orgName, {
    x: 0.8, y: 1.8, w: 8.4, h: 0.8,
    fontSize: 36, fontFace: THEME.fontFace, color: THEME.text,
    bold: true,
  });
  slide.addText(def.title || "Monthly Report", {
    x: 0.8, y: 2.6, w: 8.4, h: 0.5,
    fontSize: 20, fontFace: THEME.fontFace, color: THEME.textMuted,
  });
  slide.addText(data.period, {
    x: 0.8, y: 3.2, w: 8.4, h: 0.4,
    fontSize: 14, fontFace: THEME.fontFace, color: THEME.primary,
  });
}

function renderScorecardRow(slide: PptxGenJS.Slide, def: SlideDefinition, data: ReportData) {
  const config = def.config as ScorecardRowConfig;
  const metrics = config.metrics || [];

  slide.addText(def.title, {
    x: 0.5, y: 0.3, w: 9, h: 0.4,
    fontSize: 18, fontFace: THEME.fontFace, color: THEME.text, bold: true,
  });

  const cardW = Math.min(2.2, (9 / Math.max(metrics.length, 1)));
  const gap = 0.15;

  metrics.forEach((m, i) => {
    const sc = data.scorecards[m.label];
    const val = sc ? fmtVal(sc.value, sc.format) : "—";
    const change = sc?.prevValue !== undefined ? pctChange(sc.value, sc.prevValue) : "";
    const changeColor = sc?.prevValue !== undefined ? pctColor(sc.value, sc.prevValue) : THEME.textMuted;

    const x = 0.5 + i * (cardW + gap);

    // Card background
    slide.addShape("rect", {
      x, y: 1.0, w: cardW, h: 1.6,
      fill: { color: THEME.surface },
      rectRadius: 0.08,
      line: { color: THEME.border, width: 0.5 },
    });

    // Label
    slide.addText(m.label, {
      x: x + 0.15, y: 1.1, w: cardW - 0.3, h: 0.25,
      fontSize: 10, fontFace: THEME.fontFace, color: THEME.textMuted,
    });

    // Value
    slide.addText(val, {
      x: x + 0.15, y: 1.35, w: cardW - 0.3, h: 0.5,
      fontSize: 28, fontFace: THEME.fontFace, color: THEME.text, bold: true,
    });

    // Change
    if (change) {
      slide.addText(change, {
        x: x + 0.15, y: 1.9, w: cardW - 0.3, h: 0.25,
        fontSize: 11, fontFace: THEME.fontFace, color: changeColor,
      });
    }
  });
}

function renderChannelTable(slide: PptxGenJS.Slide, def: SlideDefinition, data: ReportData) {
  const config = def.config as ChannelTableConfig;
  const channel = data.channelData[config.sourceType];

  slide.addText(def.title, {
    x: 0.5, y: 0.3, w: 9, h: 0.4,
    fontSize: 18, fontFace: THEME.fontFace, color: THEME.text, bold: true,
  });

  if (!channel) {
    slide.addText("No data available for this source.", {
      x: 0.5, y: 2, w: 9, h: 0.4,
      fontSize: 12, fontFace: THEME.fontFace, color: THEME.textMuted,
    });
    return;
  }

  const metricNames = config.metrics.length > 0
    ? config.metrics
    : Object.keys(channel.metrics);

  // Table header
  const headerRow = [
    { text: "Metric", options: { bold: true, color: THEME.textMuted, fontSize: 10, fill: { color: THEME.surface } } },
    { text: "Last month", options: { bold: true, color: THEME.textMuted, fontSize: 10, align: "right" as const, fill: { color: THEME.surface } } },
    { text: "This month", options: { bold: true, color: THEME.textMuted, fontSize: 10, align: "right" as const, fill: { color: THEME.surface } } },
    { text: "% Change", options: { bold: true, color: THEME.textMuted, fontSize: 10, align: "right" as const, fill: { color: THEME.surface } } },
  ];

  const rows = [headerRow];

  for (const name of metricNames) {
    const m = channel.metrics[name];
    if (!m) continue;
    const change = pctChange(m.current, m.previous);
    const color = pctColor(m.current, m.previous);
    rows.push([
      { text: name, options: { fontSize: 11, color: THEME.text } },
      { text: fmtVal(m.previous, m.format), options: { fontSize: 11, color: THEME.text, align: "right" as const } },
      { text: fmtVal(m.current, m.format), options: { fontSize: 11, color: THEME.text, align: "right" as const } },
      { text: change, options: { fontSize: 11, color, align: "right" as const } },
    ]);
  }

  slide.addTable(rows as PptxGenJS.TableRow[], {
    x: 0.5, y: 1.0, w: 9,
    colW: [3, 2, 2, 2],
    border: { type: "solid", pt: 0.5, color: THEME.border },
    fontFace: THEME.fontFace,
    rowH: 0.4,
  });
}

function renderGoalsGrid(slide: PptxGenJS.Slide, def: SlideDefinition, data: ReportData) {
  const config = def.config as GoalsGridConfig;
  let goals = data.goals;
  if (config.kpiIds && config.kpiIds.length > 0) {
    goals = goals.filter((_, i) => config.kpiIds!.includes(String(i)));
  }

  slide.addText(def.title, {
    x: 0.5, y: 0.3, w: 9, h: 0.4,
    fontSize: 18, fontFace: THEME.fontFace, color: THEME.text, bold: true,
  });

  const cols = 2;
  const cardW = 4.3;
  const cardH = 1.2;
  const gap = 0.3;

  goals.forEach((g, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * (cardW + gap);
    const y = 1.0 + row * (cardH + gap);

    const pct = g.target > 0 && g.value !== null
      ? Math.min(100, (g.value / g.target) * 100)
      : 0;
    const status = pct >= 90 ? "on" : pct >= 60 ? "risk" : "off";
    const statusColor = status === "on" ? THEME.primary : status === "risk" ? THEME.amber : THEME.danger;
    const statusLabel = status === "on" ? "On track" : status === "risk" ? "At risk" : "Off track";

    // Card bg
    slide.addShape("rect", {
      x, y, w: cardW, h: cardH,
      fill: { color: THEME.surface },
      rectRadius: 0.08,
      line: { color: THEME.border, width: 0.5 },
    });

    // Name
    slide.addText(g.name, {
      x: x + 0.15, y: y + 0.08, w: cardW * 0.6, h: 0.22,
      fontSize: 11, fontFace: THEME.fontFace, color: THEME.text, bold: true,
    });

    // Status
    slide.addText(statusLabel, {
      x: x + cardW - 1.2, y: y + 0.08, w: 1.05, h: 0.22,
      fontSize: 9, fontFace: THEME.fontFace, color: statusColor, align: "right",
    });

    // Value / target
    const valStr = g.value !== null ? fmtVal(g.value, g.displayFormat) : "—";
    slide.addText(`${valStr} / ${fmtVal(g.target, g.displayFormat)}`, {
      x: x + 0.15, y: y + 0.35, w: cardW - 0.3, h: 0.3,
      fontSize: 16, fontFace: THEME.fontFace, color: THEME.text, bold: true,
    });

    // Progress bar background
    slide.addShape("rect", {
      x: x + 0.15, y: y + 0.75, w: cardW - 0.3, h: 0.08,
      fill: { color: THEME.border },
      rectRadius: 0.04,
    });

    // Progress bar fill
    if (pct > 0) {
      slide.addShape("rect", {
        x: x + 0.15, y: y + 0.75, w: (cardW - 0.3) * Math.min(1, pct / 100), h: 0.08,
        fill: { color: statusColor },
        rectRadius: 0.04,
      });
    }

    // Percentage
    slide.addText(`${pct.toFixed(0)}%`, {
      x: x + cardW - 0.8, y: y + 0.88, w: 0.65, h: 0.2,
      fontSize: 9, fontFace: THEME.fontFace, color: statusColor, align: "right",
    });
  });
}

function renderBarChart(slide: PptxGenJS.Slide, def: SlideDefinition, data: ReportData) {
  const config = def.config as ChartSlideConfig;

  slide.addText(def.title || config.title || "Chart", {
    x: 0.5, y: 0.3, w: 9, h: 0.4,
    fontSize: 18, fontFace: THEME.fontFace, color: THEME.text, bold: true,
  });

  // Build chart data from manual metrics
  if (config.manualMetricIds && config.manualMetricIds.length > 0) {
    const chartData: PptxGenJS.IChartOpts["data"] = [];

    for (const id of config.manualMetricIds) {
      const metric = data.manualMetrics.find((m) => m.name === id || m.entries.length > 0);
      if (!metric) continue;

      const labels = metric.entries.map((e) => {
        const [y, m] = e.period.split("-");
        return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short" });
      });
      chartData.push({
        name: metric.name,
        labels,
        values: metric.entries.map((e) => e.value),
      });
    }

    if (chartData.length > 0) {
      slide.addChart("bar", chartData, {
        x: 0.5, y: 1.0, w: 9, h: 4,
        showValue: false,
        catAxisLabelColor: THEME.textMuted,
        catAxisLabelFontSize: 9,
        valAxisLabelColor: THEME.textMuted,
        valAxisLabelFontSize: 9,
        chartColors: [THEME.primary, THEME.text, THEME.amber],
        plotArea: { fill: { color: THEME.bg } },
      });
    }
  }
}

function renderAiInsights(slide: PptxGenJS.Slide, def: SlideDefinition, data: ReportData) {
  slide.addText(def.title || "Insights & Recommendations", {
    x: 0.5, y: 0.3, w: 9, h: 0.4,
    fontSize: 18, fontFace: THEME.fontFace, color: THEME.text, bold: true,
  });

  const insights = data.aiInsights || "No insights generated.";

  slide.addText(insights, {
    x: 0.5, y: 1.0, w: 9, h: 4,
    fontSize: 13, fontFace: THEME.fontFace, color: THEME.text,
    lineSpacingMultiple: 1.6,
    paraSpaceBefore: 6,
    valign: "top",
  });
}

/* ──────────────────────────────────────────────
   Main render function
   ──────────────────────────────────────────────*/

const RENDERERS: Record<string, (slide: PptxGenJS.Slide, def: SlideDefinition, data: ReportData) => void> = {
  "title": renderTitle,
  "scorecard-row": renderScorecardRow,
  "channel-table": renderChannelTable,
  "goals-grid": renderGoalsGrid,
  "bar-chart": renderBarChart,
  "line-chart": renderBarChart, // reuse bar renderer for now
  "campaign-table": renderChannelTable, // similar layout
  "ai-insights": renderAiInsights,
};

export async function generateReport(
  slides: SlideDefinition[],
  data: ReportData,
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.author = "Meaning";
  pptx.subject = `${data.orgName} — ${data.period}`;
  pptx.title = `${data.orgName} Report — ${data.period}`;

  applyMaster(pptx);

  for (const def of slides) {
    const slide = pptx.addSlide({ masterName: "MEANING" });
    const renderer = RENDERERS[def.type];
    if (renderer) {
      renderer(slide, def, data);
    }
  }

  // Generate as buffer
  const output = await pptx.write({ outputType: "nodebuffer" });
  return output as Buffer;
}
