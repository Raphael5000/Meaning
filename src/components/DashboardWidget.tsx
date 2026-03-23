"use client";

import { useState } from "react";
import { GripVertical, Trash2, MoreVertical, RefreshCw } from "lucide-react";
import ChartRenderer from "./ChartRenderer";
import ScorecardWidget from "./ScorecardWidget";
import TableWidget from "./TableWidget";

interface Widget {
  id: string;
  widgetType: string;
  title: string;
  prompt: string;
  displayConfig: unknown;
  cachedData: unknown;
  cachedAt: string | null;
}

interface DashboardWidgetProps {
  widget: Widget;
  onDelete: () => void;
  refreshing?: boolean;
}

/**
 * Rebuild chart option with fresh data from cachedData rows.
 * Handles pie (name/value pairs), bar/line (xAxis categories + series data).
 */
function mergeChartData(displayConfig: Record<string, unknown>, cachedData: unknown): Record<string, unknown> {
  if (!Array.isArray(cachedData) || cachedData.length === 0) return displayConfig;
  const rows = cachedData as Record<string, unknown>[];
  const keys = Object.keys(rows[0]);
  if (keys.length < 2) return displayConfig;

  const option = JSON.parse(JSON.stringify(displayConfig)) as Record<string, unknown>;
  const series = option.series as Array<Record<string, unknown>> | undefined;
  if (!series || series.length === 0) return option;

  const chartType = series[0].type as string;

  if (chartType === "pie") {
    const nameKey = keys.find((k) => typeof rows[0][k] === "string") || keys[0];
    const valueKey = keys.find((k) => typeof rows[0][k] === "number") || keys[1];
    series[0].data = rows.map((r) => ({
      name: String(r[nameKey] ?? ""),
      value: Number(r[valueKey] ?? 0),
    }));
    // Improve pie defaults
    if (!series[0].radius) series[0].radius = ["40%", "70%"];
    if (!series[0].itemStyle) series[0].itemStyle = { borderRadius: 6, borderColor: "transparent", borderWidth: 2 };
    if (!series[0].label) series[0].label = { show: false };
    if (!series[0].emphasis) series[0].emphasis = { label: { show: true, fontSize: 13, fontWeight: "bold" } };
  } else if (chartType === "bar" || chartType === "line") {
    const dimKey = keys.find((k) => typeof rows[0][k] === "string" || k === "date" || k.includes("date")) || keys[0];
    const metricKeys = keys.filter((k) => k !== dimKey);

    const xAxis = option.xAxis as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
    const categories = rows.map((r) => String(r[dimKey] ?? ""));
    if (Array.isArray(xAxis)) {
      if (xAxis[0]) xAxis[0].data = categories;
    } else if (xAxis) {
      xAxis.data = categories;
    }

    for (let i = 0; i < series.length && i < metricKeys.length; i++) {
      series[i].data = rows.map((r) => Number(r[metricKeys[i]] ?? 0));
      // Smooth line charts
      if (chartType === "line" && series[i].smooth === undefined) series[i].smooth = true;
    }
  }

  return option;
}

export default function DashboardWidget({ widget, onDelete, refreshing }: DashboardWidgetProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--border-color)", background: "var(--card-bg, var(--bg-secondary, transparent))" }}
    >
      {/* Header */}
      <div className="flex items-center gap-1 border-b px-3 py-2" style={{ borderColor: "var(--border-color)" }}>
        <div className="widget-drag-handle flex cursor-grab items-center text-muted-foreground active:cursor-grabbing">
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <span className="flex-1 truncate text-xs font-medium text-foreground">
          {widget.title || widget.prompt}
        </span>
        {refreshing && (
          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-full z-20 mt-1 rounded-lg border py-1 shadow-lg"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border-color)", minWidth: 120 }}
              >
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-hidden p-3">
        {/* Loading overlay */}
        {refreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <div className="thinking-cursor" />
          </div>
        )}

        {widget.widgetType === "chart" && widget.displayConfig ? (
          <ChartRenderer option={mergeChartData(widget.displayConfig as Record<string, unknown>, widget.cachedData)} />
        ) : widget.widgetType === "scorecard" ? (
          <ScorecardWidget
            config={widget.displayConfig as { label?: string; format?: string }}
            data={widget.cachedData}
          />
        ) : widget.widgetType === "table" ? (
          <TableWidget
            config={widget.displayConfig as { columns?: Array<{ key: string; label: string }> }}
            data={widget.cachedData}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground">No data</p>
          </div>
        )}
      </div>
    </div>
  );
}
