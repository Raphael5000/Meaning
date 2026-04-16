"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { GripVertical, Trash2, MoreVertical, RefreshCw, Pencil, Sparkles } from "lucide-react";
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
  dashboardId: string;
  onDelete: () => void;
  onEdit: (prompt: string) => void;
  refreshing?: boolean;
}

/**
 * Rebuild chart option with fresh data from cachedData rows.
 * Produces clean, properly configured ECharts options.
 */
function mergeChartData(displayConfig: Record<string, unknown>, cachedData: unknown): Record<string, unknown> {
  if (!Array.isArray(cachedData) || cachedData.length === 0) return displayConfig;

  // Unwrap BigQuery value objects: {value: "2025-12-23"} → "2025-12-23"
  const rows = (cachedData as Record<string, unknown>[]).map((row) => {
    const unwrapped: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v && typeof v === "object" && !Array.isArray(v) && "value" in (v as Record<string, unknown>)) {
        unwrapped[k] = (v as Record<string, unknown>).value;
      } else {
        unwrapped[k] = v;
      }
    }
    return unwrapped;
  });

  const keys = Object.keys(rows[0]);
  if (keys.length < 2) return displayConfig;

  const option = JSON.parse(JSON.stringify(displayConfig)) as Record<string, unknown>;
  const series = option.series as Array<Record<string, unknown>> | undefined;
  if (!series || series.length === 0) return option;

  const chartType = series[0].type as string;

  // Remove title — it's shown in the widget header
  delete option.title;

  // Legend: always top-right, compact table style
  const legendConfig = {
    top: 4,
    right: 8,
    orient: "vertical" as const,
    type: "scroll" as const,
    textStyle: { fontSize: 11 },
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 6,
  };

  if (chartType === "pie") {
    const nameKey = keys.find((k) => typeof rows[0][k] === "string") || keys[0];
    const valueKey = keys.find((k) => typeof rows[0][k] === "number") || keys[1];
    series[0].data = rows.map((r) => ({
      name: String(r[nameKey] ?? ""),
      value: Number(r[valueKey] ?? 0),
    }));
    series[0].type = "pie";
    series[0].radius = ["40%", "65%"];
    series[0].center = ["35%", "50%"];
    series[0].itemStyle = { borderRadius: 4, borderColor: "transparent", borderWidth: 2 };
    series[0].label = { show: false };
    series[0].emphasis = {
      label: { show: true, fontSize: 12, fontWeight: "bold" },
      itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.2)" },
    };
    option.legend = { ...legendConfig, top: 8, right: 12 };
    option.tooltip = { trigger: "item", formatter: "{b}: {c} ({d}%)" };
  } else if (chartType === "bar" || chartType === "line") {
    const dimKey = keys.find((k) => {
      const v = rows[0][k];
      return typeof v === "string" || k === "date" || k.includes("date");
    }) || keys[0];
    const metricKeys = keys.filter((k) => k !== dimKey);

    const categories = rows.map((r) => {
      const v = String(r[dimKey] ?? "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const d = new Date(v + "T00:00:00");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      return v.length > 20 ? v.slice(0, 18) + "..." : v;
    });

    option.xAxis = {
      type: "category",
      data: categories,
      axisLabel: {
        fontSize: 10,
        rotate: categories.length > 10 ? 45 : 0,
        hideOverlap: true,
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "rgba(128,128,128,0.2)" } },
      boundaryGap: chartType === "bar",
    };

    option.yAxis = {
      type: "value",
      splitLine: { lineStyle: { color: "rgba(128,128,128,0.1)" } },
      axisLabel: { fontSize: 10 },
    };

    // Auto-create series for metric columns that don't have a matching series
    while (series.length < metricKeys.length) {
      series.push({
        name: metricKeys[series.length].replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        type: chartType,
        data: [],
      });
    }

    for (let i = 0; i < series.length && i < metricKeys.length; i++) {
      series[i].data = rows.map((r) => Number(r[metricKeys[i]] ?? 0));
      if (chartType === "line") {
        series[i].smooth = true;
        series[i].symbol = "circle";
        series[i].symbolSize = 4;
        series[i].areaStyle = { opacity: 0.06 };
        series[i].lineStyle = { width: 2 };
      }
      if (chartType === "bar") {
        series[i].barMaxWidth = 36;
        series[i].itemStyle = { borderRadius: [3, 3, 0, 0] };
      }
    }

    option.tooltip = {
      trigger: "axis",
      axisPointer: { type: chartType === "bar" ? "shadow" : "line" },
    };

    option.grid = {
      left: 8,
      right: 12,
      top: series.length > 1 ? 32 : 12,
      bottom: 24,
      containLabel: true,
    };

    if (series.length > 1) {
      option.legend = { ...legendConfig, orient: "horizontal", top: 4, right: undefined, left: "center" };
    } else {
      option.legend = { show: false };
    }
  } else if (chartType === "sankey") {
    // Sankey: rows have from_page, to_page, transitions
    // Rebuild nodes and links from the data
    const fromKey = keys.find((k) => k.includes("from")) || keys[0];
    const toKey = keys.find((k) => k.includes("to")) || keys[1];
    const valueKey = keys.find((k) => typeof rows[0][k] === "number") || keys[2];

    if (fromKey && toKey && valueKey) {
      const nodeSet = new Set<string>();
      const links: Array<{ source: string; target: string; value: number }> = [];

      for (const row of rows) {
        const source = String(row[fromKey] ?? "");
        const target = String(row[toKey] ?? "");
        const value = Number(row[valueKey] ?? 0);
        if (source && target && source !== target) {
          nodeSet.add(source);
          nodeSet.add(target);
          links.push({ source, target, value });
        }
      }

      series[0].data = Array.from(nodeSet).map((name) => ({ name }));
      series[0].links = links;
      series[0].emphasis = { focus: "adjacency" };
      series[0].lineStyle = { color: "gradient", curveness: 0.5 };
    }

    option.tooltip = { trigger: "item", triggerOn: "mousemove" };
  }

  return option;
}

/** Wrapper that measures its container and renders chart at exact size */
function ResizableChart({ option }: { option: Record<string, unknown> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setSize((prev) => {
          if (prev && Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2) return prev;
          return { w: width, h: height };
        });
      }
    };
    measure();
    const observer = new ResizeObserver(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(measure, 50);
    });
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      {size && (
        <ChartRenderer
          key={`${size.w}-${size.h}`}
          option={option}
          styleOverride={{ width: size.w, height: size.h }}
        />
      )}
    </div>
  );
}

export default function DashboardWidget({ widget, dashboardId, onDelete, onEdit, refreshing }: DashboardWidgetProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(widget.title || widget.prompt);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  function saveTitle() {
    const newTitle = titleDraft.trim();
    if (!newTitle || newTitle === widget.title) {
      setTitleDraft(widget.title || widget.prompt);
      setEditingTitle(false);
      return;
    }
    setEditingTitle(false);
    // Optimistic update — widget.title is readonly so we track via titleDraft
    // Persist to API (fire-and-forget)
    fetch(`/api/dashboards/${dashboardId}/widgets/${widget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    }).catch(() => {});
  }

  return (
    <div
      className="widget-glass flex h-full w-full flex-col overflow-hidden rounded-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-1 border-b px-3 py-2" style={{ borderColor: "rgba(128,128,128,0.15)" }}>
        <div className="widget-drag-handle flex cursor-grab items-center text-muted-foreground active:cursor-grabbing">
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") { setTitleDraft(widget.title || widget.prompt); setEditingTitle(false); }
            }}
            className="flex-1 truncate rounded border border-border bg-transparent px-1 py-0 text-xs font-medium text-foreground outline-none focus:border-[var(--accent)]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="flex-1 truncate text-left text-xs font-medium text-foreground hover:underline"
          >
            {titleDraft}
          </button>
        )}
        {(refreshing || widget.widgetType === "generating") && (
          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
        {widget.widgetType !== "generating" && <div>
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => {
              if (!menuOpen && menuBtnRef.current) {
                const rect = menuBtnRef.current.getBoundingClientRect();
                setMenuPos({ top: rect.bottom + 4, left: rect.right });
              }
              setMenuOpen(!menuOpen);
            }}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {menuOpen && createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
              <div
                className="fixed z-[9999] rounded-lg border py-1 shadow-lg"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: "var(--border-color)",
                  minWidth: 120,
                  top: menuPos?.top ?? 0,
                  left: (menuPos?.left ?? 0) - 120,
                }}
              >
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onEdit(widget.prompt); }}
                  className="menu-btn flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </>,
            document.body
          )}
        </div>}
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-hidden">
        {/* Loading overlay — skeleton shimmer */}
        {refreshing && (
          <div className="absolute inset-0 z-10 flex flex-col gap-3 p-4" style={{ background: "var(--card-bg, var(--bg-secondary, transparent))" }}>
            <div className="h-3 w-3/4 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted" style={{ animationDelay: "150ms" }} />
            <div className="flex-1 animate-pulse rounded-lg bg-muted" style={{ animationDelay: "300ms" }} />
            <div className="flex gap-3">
              <div className="h-3 w-1/4 animate-pulse rounded-md bg-muted" style={{ animationDelay: "450ms" }} />
              <div className="h-3 w-1/4 animate-pulse rounded-md bg-muted" style={{ animationDelay: "600ms" }} />
            </div>
          </div>
        )}

        {widget.widgetType === "generating" ? (
          <div className="flex h-full flex-col gap-4 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" style={{ color: "var(--accent)" }} />
              <span>Generating widget...</span>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <div className="h-3 w-3/4 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted" style={{ animationDelay: "150ms" }} />
              <div className="flex-1 animate-pulse rounded-lg bg-muted" style={{ animationDelay: "300ms" }} />
              <div className="flex gap-3">
                <div className="h-3 w-1/4 animate-pulse rounded-md bg-muted" style={{ animationDelay: "450ms" }} />
                <div className="h-3 w-1/4 animate-pulse rounded-md bg-muted" style={{ animationDelay: "600ms" }} />
                <div className="h-3 w-1/4 animate-pulse rounded-md bg-muted" style={{ animationDelay: "750ms" }} />
              </div>
            </div>
          </div>
        ) : widget.widgetType === "chart" && widget.displayConfig ? (
          <div className="h-full w-full p-2">
            <ResizableChart option={mergeChartData(widget.displayConfig as Record<string, unknown>, widget.cachedData)} />
          </div>
        ) : widget.widgetType === "scorecard" ? (
          <div className="h-full p-3">
            <ScorecardWidget
              config={widget.displayConfig as { label?: string; value?: string; change?: string; format?: string }}
              data={widget.cachedData}
            />
          </div>
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
