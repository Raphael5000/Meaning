"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { GripVertical, Trash2, MoreVertical, RefreshCw, Pencil, Sparkles } from "lucide-react";
import ChartRenderer, { ACCENT_PALETTE } from "./ChartRenderer";
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

interface KpiTarget {
  name: string;
  targetValue: number;
  targetDirection: string;
  cachedValue: number | null;
  displayFormat: string;
}

interface DashboardWidgetProps {
  widget: Widget;
  dashboardId: string;
  onDelete: () => void;
  onEdit: (prompt: string) => void;
  refreshing?: boolean;
  kpiTargets?: KpiTarget[];
}

/**
 * Rebuild chart option with fresh data from cachedData rows.
 * Produces clean, properly configured ECharts options.
 */
function mergeChartData(displayConfig: Record<string, unknown>, cachedData: unknown, kpiTargets?: KpiTarget[]): Record<string, unknown> {
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

  // ── Date formatting helper (consistent across all time series) ──
  function formatDateLabel(v: string): string {
    // Monthly: "2026-01" → "Jan 2026"
    if (/^\d{4}-\d{2}$/.test(v)) {
      const [y, m] = v.split("-");
      return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    // Daily: "2026-01-23" → "Jan 23"
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const d = new Date(v + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return v.length > 20 ? v.slice(0, 18) + "..." : v;
  }

  // ── Check if first column is a date dimension ──
  function isDateColumn(key: string, firstVal: unknown): boolean {
    const s = String(firstVal ?? "");
    return key.includes("date") || key === "d" || key === "day" || key === "month" || key === "week"
      || /^\d{4}-\d{2}(-\d{2})?$/.test(s);
  }

  // Legend: always top-right, compact for dashboard widgets.
  // Explicitly set bottom/left to undefined to override applyTheme defaults.
  const legendConfig = {
    show: true,
    top: 4,
    right: 8,
    bottom: undefined,
    left: undefined,
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
    series[0].radius = ["40%", "70%"];
    series[0].center = ["50%", "50%"];
    series[0].itemStyle = { borderRadius: 4, borderColor: "transparent", borderWidth: 2 };
    series[0].label = { show: false };
    series[0].emphasis = {
      label: { show: false },
      itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.2)" },
    };
    // Disable ECharts legend — we render our own table legend in the widget
    option.legend = { show: false };
    option.tooltip = { trigger: "item", formatter: "{b}: {c} ({d}%)" };
    // Store pie data for the widget table legend
    option._pieLegend = series[0].data;
  } else if (chartType === "bar" || chartType === "line") {
    const dimKey = keys.find((k) => {
      const v = rows[0][k];
      return typeof v === "string" || k === "date" || k.includes("date");
    }) || keys[0];
    const metricKeys = keys.filter((k) => k !== dimKey);
    const isTimeSeries = isDateColumn(dimKey, rows[0][dimKey]);

    // Fill date gaps for time series so every day/month shows (even with 0 values)
    let filledRows = rows;
    if (isTimeSeries && rows.length >= 2) {
      const dateVals = rows.map((r) => String(r[dimKey] ?? ""));
      const isDaily = /^\d{4}-\d{2}-\d{2}$/.test(dateVals[0]);
      const isMonthly = /^\d{4}-\d{2}$/.test(dateVals[0]);

      if (isDaily) {
        const dateSet = new Set(dateVals);
        const sorted = [...dateSet].sort();
        const start = new Date(sorted[0] + "T00:00:00");
        const end = new Date(sorted[sorted.length - 1] + "T00:00:00");
        const allDates: string[] = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          allDates.push(d.toISOString().split("T")[0]);
        }
        if (allDates.length > dateSet.size) {
          const rowMap = new Map(rows.map((r) => [String(r[dimKey]), r]));
          filledRows = allDates.map((date) => {
            if (rowMap.has(date)) return rowMap.get(date)!;
            const zero: Record<string, unknown> = { [dimKey]: date };
            for (const mk of metricKeys) zero[mk] = 0;
            return zero;
          });
        }
      } else if (isMonthly) {
        const dateSet = new Set(dateVals);
        const sorted = [...dateSet].sort();
        const [startY, startM] = sorted[0].split("-").map(Number);
        const [endY, endM] = sorted[sorted.length - 1].split("-").map(Number);
        const allMonths: string[] = [];
        let y = startY, m = startM;
        while (y < endY || (y === endY && m <= endM)) {
          allMonths.push(`${y}-${String(m).padStart(2, "0")}`);
          m++;
          if (m > 12) { m = 1; y++; }
        }
        if (allMonths.length > dateSet.size) {
          const rowMap = new Map(rows.map((r) => [String(r[dimKey]), r]));
          filledRows = allMonths.map((month) => {
            if (rowMap.has(month)) return rowMap.get(month)!;
            const zero: Record<string, unknown> = { [dimKey]: month };
            for (const mk of metricKeys) zero[mk] = 0;
            return zero;
          });
        }
      }
    }

    const categories = filledRows.map((r) => formatDateLabel(String(r[dimKey] ?? "")));

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
      series[i].data = filledRows.map((r) => Number(r[metricKeys[i]] ?? 0));
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

    // Inject KPI target markLines on matching series
    if (kpiTargets && kpiTargets.length > 0) {
      const stopWords = new Set(["the", "a", "an", "of", "for", "and", "or", "in", "to", "per", "total", "avg", "average", "daily", "weekly", "monthly"]);
      const synonyms: Record<string, string[]> = {
        visits: ["sessions"], sessions: ["visits"],
        users: ["visitors"], visitors: ["users"],
        revenue: ["sales", "income"], sales: ["revenue"], income: ["revenue"],
      };
      const tokenize = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter((w) => !stopWords.has(w) && w.length > 1);
      const expandWithSynonyms = (tokens: string[]) => {
        const expanded = [...tokens];
        for (const t of tokens) {
          if (synonyms[t]) expanded.push(...synonyms[t]);
        }
        return [...new Set(expanded)];
      };

      // Detect chart granularity from x-axis categories
      const cats = categories || [];
      const isChartDaily = cats.length >= 2 && cats.some((c: string) => /^[A-Z][a-z]{2} \d{1,2}$/.test(c));

      for (let i = 0; i < series.length && i < metricKeys.length; i++) {
        const seriesName = (series[i].name as string || metricKeys[i]).toLowerCase();
        const metricKey = metricKeys[i].toLowerCase();
        const widgetTokens = expandWithSynonyms([...new Set([...tokenize(seriesName), ...tokenize(metricKey)])]);
        const match = kpiTargets.find((kpi) => {
          const kpiName = kpi.name.toLowerCase();
          if (kpiName.includes(metricKey) || metricKey.includes(kpiName)
            || kpiName.includes(seriesName) || seriesName.includes(kpiName)) return true;
          const kpiTokens = expandWithSynonyms(tokenize(kpi.name));
          const overlap = kpiTokens.filter((t) => widgetTokens.some((w) => w.includes(t) || t.includes(w)));
          // Require majority overlap to avoid false matches
          // e.g. "website leads" should NOT match "monthly website visits" (1 of 2 tokens)
          const minTokens = Math.min(kpiTokens.length, widgetTokens.length);
          return minTokens > 0 && overlap.length >= Math.max(2, Math.ceil(minTokens * 0.6));
        });
        if (match) {
          // Normalize target to chart granularity
          // e.g. monthly target of 1,000 on a daily chart → ~33/day
          let targetLine = match.targetValue;
          let legendName = `Target: ${match.targetValue.toLocaleString()}`;
          if (isChartDaily && match.displayFormat !== "percentage") {
            const dailyTarget = match.targetValue / 30;
            targetLine = Math.round(dailyTarget);
            legendName = `Target: ${targetLine.toLocaleString()}/day (${match.targetValue.toLocaleString()}/mo)`;
          }

          series[i].markLine = {
            silent: true,
            symbol: "none",
            lineStyle: { type: "dashed", color: "#ef4444", width: 1.5 },
            label: { show: false },
            data: [{ yAxis: targetLine }],
          };

          // Store for the custom table legend
          option._kpiTargetLegend = { name: legendName, value: targetLine };
        }
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

    // Disable ECharts legend — multi-series gets a table legend in the widget
    option.legend = { show: false };
    // Show table legend for multi-series OR when a KPI target line is present
    if (series.length > 1 || option._kpiTargetLegend) {
      option._barLegend = series.map((s, i) => ({
        name: s.name as string || `Series ${i + 1}`,
        total: (s.data as number[]).reduce((sum: number, v: number) => sum + (v || 0), 0),
        color: ACCENT_PALETTE[i % ACCENT_PALETTE.length],
      }));
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
  } else if (chartType === "funnel") {
    // Funnel: rows have stage name + value (e.g. step, count)
    const nameKey = keys.find((k) => typeof rows[0][k] === "string") || keys[0];
    const valueKey = keys.find((k) => typeof rows[0][k] === "number") || keys[1];

    series[0].data = rows.map((r) => ({
      name: String(r[nameKey] ?? ""),
      value: Number(r[valueKey] ?? 0),
    }));
    series[0].type = "funnel";
    series[0].left = "10%";
    series[0].width = "80%";
    series[0].gap = 2;
    series[0].label = { show: true, position: "inside", fontSize: 12, formatter: "{b}" };
    series[0].itemStyle = { borderColor: "transparent", borderWidth: 1 };
    series[0].emphasis = { label: { fontSize: 14, fontWeight: "bold" } };

    option.tooltip = { trigger: "item", formatter: "{b}: {c}" };
    option.legend = { show: false };
  } else if (chartType === "scatter") {
    // Scatter: first numeric col = x, second numeric col = y, optional string col = label
    const numericKeys = keys.filter((k) => typeof rows[0][k] === "number");
    const labelKey = keys.find((k) => typeof rows[0][k] === "string");
    const xKey = numericKeys[0] || keys[0];
    const yKey = numericKeys[1] || keys[1];

    series[0].data = rows.map((r) => [Number(r[xKey] ?? 0), Number(r[yKey] ?? 0)]);
    series[0].type = "scatter";
    series[0].symbolSize = 10;
    series[0].itemStyle = { opacity: 0.7 };

    option.xAxis = {
      type: "value",
      name: xKey.replace(/_/g, " "),
      nameLocation: "center",
      nameGap: 30,
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(128,128,128,0.1)" } },
    };
    option.yAxis = {
      type: "value",
      name: yKey.replace(/_/g, " "),
      nameLocation: "center",
      nameGap: 40,
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(128,128,128,0.1)" } },
    };
    option.tooltip = {
      trigger: "item",
      formatter: (params: { value: number[] }) => {
        const [x, y] = params.value;
        return `${xKey.replace(/_/g, " ")}: ${x}<br/>${yKey.replace(/_/g, " ")}: ${y}`;
      },
    };
    option.grid = { left: 8, right: 12, top: 12, bottom: 36, containLabel: true };
  } else if (chartType === "radar") {
    // Radar: rows are categories, columns are metrics
    const dimKey = keys.find((k) => typeof rows[0][k] === "string") || keys[0];
    const metricKeys = keys.filter((k) => k !== dimKey);

    const indicator = metricKeys.map((k) => {
      const max = Math.max(...rows.map((r) => Number(r[k] ?? 0))) * 1.2 || 100;
      return { name: k.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()), max };
    });

    // Each row becomes a data point on the radar
    series[0].type = "radar";
    series[0].data = rows.map((r) => ({
      name: String(r[dimKey] ?? ""),
      value: metricKeys.map((k) => Number(r[k] ?? 0)),
      areaStyle: { opacity: 0.1 },
    }));

    option.radar = { indicator, shape: "polygon", splitArea: { show: false }, axisName: { fontSize: 10, color: "var(--text-muted)" } };
    option.tooltip = { trigger: "item" };
    option.legend = { ...legendConfig, orient: "horizontal", top: 4, right: undefined, left: "center", bottom: undefined };
    delete option.xAxis;
    delete option.yAxis;
  } else if (chartType === "gauge") {
    // Gauge: single value with optional max
    const valueKey = keys.find((k) => typeof rows[0][k] === "number") || keys[0];
    const value = Number(rows[0][valueKey] ?? 0);

    series[0].type = "gauge";
    series[0].data = [{ value, name: valueKey.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) }];
    series[0].detail = { fontSize: 24, fontWeight: "bold", offsetCenter: [0, "60%"] };
    series[0].title = { fontSize: 12, offsetCenter: [0, "80%"] };
    series[0].progress = { show: true, roundCap: true, width: 12 };
    series[0].axisLine = { roundCap: true, lineStyle: { width: 12 } };
    series[0].axisTick = { show: false };
    series[0].splitLine = { show: false };
    series[0].pointer = { show: false };

    option.tooltip = { show: false };
    delete option.xAxis;
    delete option.yAxis;
  } else if (chartType === "heatmap") {
    // Heatmap: rows have x category, y category, and value
    // e.g. day_of_week, hour_of_day, sessions
    const xKey = keys[0];
    const yKey = keys[1];
    const valueKey = keys.find((k) => typeof rows[0][k] === "number") || keys[2];

    const xCategories = [...new Set(rows.map((r) => String(r[xKey] ?? "")))];
    const yCategories = [...new Set(rows.map((r) => String(r[yKey] ?? "")))];

    const data = rows.map((r) => [
      xCategories.indexOf(String(r[xKey] ?? "")),
      yCategories.indexOf(String(r[yKey] ?? "")),
      Number(r[valueKey] ?? 0),
    ]);
    const maxVal = Math.max(...data.map((d) => d[2]));

    series[0].type = "heatmap";
    series[0].data = data;
    series[0].label = { show: true, fontSize: 9 };
    series[0].emphasis = { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" } };

    option.xAxis = { type: "category", data: xCategories, axisLabel: { fontSize: 10 }, splitArea: { show: true } };
    option.yAxis = { type: "category", data: yCategories, axisLabel: { fontSize: 10 }, splitArea: { show: true } };
    option.visualMap = {
      min: 0,
      max: maxVal || 100,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 4,
      itemWidth: 10,
      itemHeight: 80,
      textStyle: { fontSize: 10 },
      inRange: { color: ["#f0fdf4", "#22c55e", "#15803d"] },
    };
    option.grid = { left: 8, right: 12, top: 12, bottom: 60, containLabel: true };
    option.tooltip = { trigger: "item", formatter: (params: { value: number[] }) => `${xCategories[params.value[0]]}, ${yCategories[params.value[1]]}: ${params.value[2]}` };
  } else if (chartType === "treemap") {
    // Treemap: rows have name + value, optionally with parent for hierarchy
    const nameKey = keys.find((k) => typeof rows[0][k] === "string") || keys[0];
    const valueKey = keys.find((k) => typeof rows[0][k] === "number") || keys[1];

    series[0].type = "treemap";
    series[0].data = rows.map((r) => ({
      name: String(r[nameKey] ?? ""),
      value: Number(r[valueKey] ?? 0),
    }));
    series[0].leafDepth = 1;
    series[0].label = { show: true, fontSize: 12 };
    series[0].breadcrumb = { show: false };
    series[0].itemStyle = { borderColor: "var(--bg-primary)", borderWidth: 2, gapWidth: 2 };
    series[0].levels = [
      { itemStyle: { borderRadius: 6 }, upperLabel: { show: false } },
    ];

    option.tooltip = { trigger: "item", formatter: "{b}: {c}" };
    delete option.xAxis;
    delete option.yAxis;
  }

  return option;
}

/** Table legend for pie/bar charts — rendered next to the chart in the widget */
function WidgetTableLegend({ items, isPercentage }: { items: Array<{ name: string; value: number; color: string }>; isPercentage?: boolean }) {
  const total = items.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="flex flex-col justify-center gap-1.5 overflow-y-auto py-2 pr-2" style={{ minWidth: 100, maxWidth: "40%" }}>
      {items.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          {d.name.startsWith("Target:") ? (
            <span className="inline-block h-0 w-3 shrink-0 border-t-2 border-dashed" style={{ borderColor: d.color }} />
          ) : (
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
          )}
          <span className="min-w-0 flex-1 truncate" style={{ color: "var(--text-primary)" }}>{d.name}</span>
          <span className="shrink-0 tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {d.value.toLocaleString()}
          </span>
          {isPercentage && total > 0 && (
            <span className="shrink-0 tabular-nums" style={{ color: "var(--text-muted)", width: 38, textAlign: "right" }}>
              {((d.value / total) * 100).toFixed(0)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Flex-1 chart slot that measures its own width so ECharts gets exact pixels */
function FlexChart({ option, height }: { option: Record<string, unknown>; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const measure = () => {
      if (!ref.current) return;
      const w = ref.current.getBoundingClientRect().width;
      if (w > 0) setWidth((prev) => (prev !== null && Math.abs(prev - w) < 2 ? prev : w));
    };
    measure();
    const observer = new ResizeObserver(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(measure, 50);
    });
    observer.observe(ref.current);
    return () => { observer.disconnect(); if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <div ref={ref} className="min-w-0 flex-1" style={{ height }}>
      {width !== null && (
        <ChartRenderer
          key={`${width}-${height}`}
          option={option}
          styleOverride={{ width, height }}
        />
      )}
    </div>
  );
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

  // Extract legend data from the option (set by mergeChartData)
  const pieLegend = option._pieLegend as Array<{ name: string; value: number }> | undefined;
  const barLegend = option._barLegend as Array<{ name: string; total: number; color: string }> | undefined;
  const kpiTargetLegend = option._kpiTargetLegend as { name: string; value: number } | undefined;
  const hasTableLegend = pieLegend || barLegend || kpiTargetLegend;

  // Clean option before passing to ECharts (remove our custom keys)
  const cleanOption = { ...option };
  delete cleanOption._pieLegend;
  delete cleanOption._barLegend;
  delete cleanOption._kpiTargetLegend;

  const legendItems = pieLegend
    ? pieLegend.map((d, i) => ({ name: d.name, value: d.value, color: ACCENT_PALETTE[i % ACCENT_PALETTE.length] }))
    : barLegend
      ? barLegend.map((d) => ({ name: d.name, value: d.total, color: d.color }))
      : [];

  // Add KPI target as a dashed-line legend entry
  if (kpiTargetLegend) {
    legendItems.push({ name: kpiTargetLegend.name, value: kpiTargetLegend.value, color: "#ef4444" });
  }

  if (!size) {
    return <div ref={containerRef} className="h-full w-full" />;
  }

  if (hasTableLegend && pieLegend) {
    // Pie: keep the 60/40 split — its legend rows include percentages and benefit from the width
    const chartWidth = Math.floor(size.w * 0.6);
    return (
      <div ref={containerRef} className="flex h-full w-full items-stretch">
        <div style={{ width: chartWidth, height: size.h }}>
          <ChartRenderer
            key={`${chartWidth}-${size.h}`}
            option={cleanOption}
            styleOverride={{ width: chartWidth, height: size.h }}
          />
        </div>
        <WidgetTableLegend items={legendItems} isPercentage={true} />
      </div>
    );
  }

  if (hasTableLegend) {
    // Line/bar: chart fills remaining width, legend takes only its content width
    return (
      <div ref={containerRef} className="flex h-full w-full items-stretch">
        <FlexChart option={cleanOption} height={size.h} />
        <WidgetTableLegend items={legendItems} isPercentage={false} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <ChartRenderer
        key={`${size.w}-${size.h}`}
        option={cleanOption}
        styleOverride={{ width: size.w, height: size.h }}
      />
    </div>
  );
}

export default function DashboardWidget({ widget, dashboardId, onDelete, onEdit, refreshing, kpiTargets }: DashboardWidgetProps) {
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
        {/* Loading overlay — skeleton shimmer (fully opaque to hide stale data) */}
        {refreshing && (
          <div className="absolute inset-0 z-10 flex flex-col gap-3 p-4" style={{ background: "var(--bg-primary)" }}>
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
            <ResizableChart option={mergeChartData(widget.displayConfig as Record<string, unknown>, widget.cachedData, kpiTargets)} />
          </div>
        ) : widget.widgetType === "scorecard" ? (
          <div className="h-full p-3">
            <ScorecardWidget
              config={widget.displayConfig as { label?: string; value?: string; change?: string; format?: string }}
              data={widget.cachedData}
              kpiTargets={kpiTargets}
              widgetTitle={widget.title || widget.prompt}
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
