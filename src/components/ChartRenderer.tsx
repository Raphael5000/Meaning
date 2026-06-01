"use client";

import { useMemo, useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  FunnelChart,
  GaugeChart,
  TreemapChart,
  SunburstChart,
  HeatmapChart,
  MapChart,
  SankeyChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
  VisualMapComponent,
  ToolboxComponent,
  GeoComponent,
  MarkLineComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useTheme } from "./ThemeProvider";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  FunnelChart,
  GaugeChart,
  TreemapChart,
  SunburstChart,
  HeatmapChart,
  MapChart,
  SankeyChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
  VisualMapComponent,
  ToolboxComponent,
  GeoComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

export const ACCENT_PALETTE = [
  "#10a37f",
  "#e5e7eb",
  "#9ca3af",
  "#10a37f99",
  "#e5e7eb99",
  "#9ca3af99",
];

/** Vibrant palette specifically for sankey diagrams – matches the neon-on-dark design reference */
const SANKEY_PALETTE = [
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#3b82f6", // blue
  "#a855f7", // purple
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo
  "#10b981", // emerald
];

/** Check whether the ECharts option uses a map series or geo component */
function needsWorldMap(option: Record<string, unknown>): boolean {
  const series = option.series;
  if (Array.isArray(series)) {
    if (series.some((s) => (s as Record<string, unknown>).type === "map")) return true;
  } else if (series && (series as Record<string, unknown>).type === "map") {
    return true;
  }
  if (option.geo) return true;
  return false;
}

/** Lazy-load and register the world GeoJSON with ECharts (fetched once, cached) */
let worldMapPromise: Promise<void> | null = null;
let worldMapLoaded = false;

function ensureWorldMap(): Promise<void> {
  if (worldMapLoaded) return Promise.resolve();
  if (worldMapPromise) return worldMapPromise;
  worldMapPromise = fetch("/maps/world.json")
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load world map (${res.status})`);
      return res.json();
    })
    .then((geoJson) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      echarts.registerMap("world", geoJson as any);
      worldMapLoaded = true;
    })
    .catch((err) => {
      worldMapPromise = null; // allow retry
      throw err;
    });
  return worldMapPromise;
}

/** Detect whether the option contains a sankey series */
function isSankeyChart(option: Record<string, unknown>): boolean {
  const series = option.series;
  if (Array.isArray(series)) {
    return series.some((s) => (s as Record<string, unknown>).type === "sankey");
  }
  if (series && (series as Record<string, unknown>).type === "sankey") return true;
  return false;
}

/** Remove cycles from sankey data so ECharts doesn't throw.
 *  Uses topological sort — drops the weakest link in any cycle found. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function removeSankeyCycles(series: any): any {
  if (series.type !== "sankey") return series;

  const nodes: { name: string }[] = Array.isArray(series.data) ? series.data : series.nodes || [];
  const links: { source: string | number; target: string | number; value: number }[] = series.links || [];
  if (links.length === 0) return series;

  // Build name-based adjacency for cycle detection
  const nameSet = new Set(nodes.map((n) => n.name));
  // Ensure all link sources/targets are in the node set
  for (const l of links) {
    if (typeof l.source === "string" && !nameSet.has(l.source)) {
      nodes.push({ name: l.source });
      nameSet.add(l.source);
    }
    if (typeof l.target === "string" && !nameSet.has(l.target)) {
      nodes.push({ name: l.target });
      nameSet.add(l.target);
    }
  }

  // Repeatedly remove links that form cycles using in-degree/topological approach
  let safeLinks = [...links];
  for (let iter = 0; iter < 20; iter++) {
    const adj = new Map<string, { target: string; idx: number; value: number }[]>();
    const inDeg = new Map<string, number>();
    for (const n of nameSet) { adj.set(n, []); inDeg.set(n, 0); }
    for (let i = 0; i < safeLinks.length; i++) {
      const s = String(safeLinks[i].source);
      const t = String(safeLinks[i].target);
      adj.get(s)?.push({ target: t, idx: i, value: safeLinks[i].value || 1 });
      inDeg.set(t, (inDeg.get(t) || 0) + 1);
    }

    // Kahn's algorithm
    const queue: string[] = [];
    for (const [n, deg] of inDeg) { if (deg === 0) queue.push(n); }
    const visited = new Set<string>();
    while (queue.length > 0) {
      const n = queue.shift()!;
      visited.add(n);
      for (const edge of adj.get(n) || []) {
        const newDeg = (inDeg.get(edge.target) || 1) - 1;
        inDeg.set(edge.target, newDeg);
        if (newDeg === 0) queue.push(edge.target);
      }
    }

    if (visited.size === nameSet.size) break; // No cycles

    // Find the weakest link among unvisited nodes and remove it
    let weakestIdx = -1;
    let weakestVal = Infinity;
    for (let i = 0; i < safeLinks.length; i++) {
      const s = String(safeLinks[i].source);
      const t = String(safeLinks[i].target);
      if (!visited.has(s) || !visited.has(t)) {
        const v = safeLinks[i].value || 1;
        if (v < weakestVal) { weakestVal = v; weakestIdx = i; }
      }
    }
    if (weakestIdx >= 0) safeLinks.splice(weakestIdx, 1);
    else break;
  }

  return { ...series, data: nodes, links: safeLinks };
}

/** Apply clean styling to sankey series — optimized for readability */
function applySankeyTheme(
  option: Record<string, unknown>,
  isDark: boolean
): Record<string, unknown> {
  const textColor = isDark ? "#e0e0e0" : "#1a1a1a";
  const mutedColor = isDark ? "#888" : "#777";
  const series = option.series;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const styleSeries = (s: any) => {
    if (s.type !== "sankey") return s;

    const nodes = Array.isArray(s.data) ? s.data : s.nodes || [];
    const coloredNodes = nodes.map((node: Record<string, unknown>, i: number) => {
      const nodeColor = SANKEY_PALETTE[i % SANKEY_PALETTE.length];
      // Truncate long names for readability
      const name = String(node.name ?? "");
      const shortName = name.length > 25 ? name.slice(0, 23) + "..." : name;
      return {
        ...node,
        name: shortName,
        itemStyle: {
          color: nodeColor,
          borderColor: "transparent",
          borderWidth: 0,
        },
      };
    });

    // Also truncate link source/target to match
    const links = Array.isArray(s.links) ? s.links : [];
    const truncate = (n: string) => n.length > 25 ? n.slice(0, 23) + "..." : n;
    const truncatedLinks = links.map((link: Record<string, unknown>) => ({
      ...link,
      source: truncate(String(link.source ?? "")),
      target: truncate(String(link.target ?? "")),
    }));

    return {
      ...s,
      data: coloredNodes,
      links: truncatedLinks,
      type: "sankey",
      layoutIterations: 32,
      nodeWidth: 12,
      nodeGap: 24,
      nodeAlign: "justify",
      draggable: true,
      emphasis: {
        focus: "adjacency",
        lineStyle: { opacity: 0.6 },
      },
      lineStyle: {
        color: "gradient",
        opacity: 0.25,
        curveness: 0.5,
      },
      label: {
        show: true,
        position: "right",
        fontSize: 10,
        fontWeight: 500,
        color: textColor,
        formatter: (params: { name: string; value: number | string }) => {
          const val = typeof params.value === "number"
            ? params.value.toLocaleString()
            : params.value ?? "";
          return `${params.name}  ${val}`;
        },
      },
      itemStyle: {
        borderRadius: 3,
        borderColor: "transparent",
        borderWidth: 0,
      },
    };
  };

  const themedSeries = Array.isArray(series)
    ? series.map(styleSeries)
    : series
    ? styleSeries(series)
    : series;

  return {
    ...option,
    series: themedSeries,
    color: SANKEY_PALETTE,
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      backgroundColor: isDark ? "rgba(20,20,30,0.92)" : "rgba(255,255,255,0.95)",
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
      borderWidth: 1,
      padding: [8, 12],
      textStyle: {
        color: textColor,
        fontSize: 12,
      },
      extraCssText: "border-radius:8px;",
      ...(option.tooltip as Record<string, unknown> | undefined),
    },
  };
}

/** Apply clean, modern bar styling */
function applyGlassBarStyle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: any[],
  isDark: boolean,
  palette: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  return series.map((s, idx) => {
    if (s.type !== "bar") return s;
    const baseColor = palette[idx % palette.length];
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    return {
      ...s,
      itemStyle: {
        color: `rgba(${r},${g},${b},${isDark ? 0.85 : 0.8})`,
        ...(s.itemStyle as Record<string, unknown> | undefined),
        borderRadius: (s.itemStyle as Record<string, unknown> | undefined)?.borderRadius ?? [3, 3, 0, 0],
      },
      emphasis: {
        itemStyle: {
          color: baseColor,
        },
        ...(s.emphasis as Record<string, unknown> | undefined),
      },
    };
  });
}

function applyTheme(
  option: Record<string, unknown>,
  isDark: boolean
): Record<string, unknown> {
  const textColor = isDark ? "#ececec" : "#1a1a1a";
  const subtextColor = isDark ? "#8e8e8e" : "#8e8e8e";
  const axisLineColor = isDark ? "#3a3a3a" : "#e0e0e0";
  const splitLineColor = isDark ? "#2f2f2f" : "#f0f0f0";

  let themed: Record<string, unknown> = {
    ...option,
    backgroundColor: "transparent",
    color: ACCENT_PALETTE,
    title: {
      ...(option.title as Record<string, unknown> | undefined),
      textStyle: {
        color: textColor,
        fontSize: 14,
        fontWeight: 600,
        ...((option.title as Record<string, unknown>)?.textStyle as Record<string, unknown> | undefined),
      },
      subtextStyle: {
        color: subtextColor,
        ...((option.title as Record<string, unknown>)?.subtextStyle as Record<string, unknown> | undefined),
      },
    },
    legend: {
      type: "scroll",
      bottom: 0,
      left: "center",
      orient: "horizontal",
      itemGap: 16,
      itemWidth: 12,
      itemHeight: 12,
      icon: "roundRect",
      pageIconColor: isDark ? "#aaa" : "#666",
      pageTextStyle: { color: textColor },
      ...(option.legend as Record<string, unknown> | undefined),
      textStyle: {
        color: textColor,
        fontSize: 12,
        ...((option.legend as Record<string, unknown>)?.textStyle as Record<string, unknown> | undefined),
      },
    },
    grid: {
      left: 48,
      right: 24,
      top: 40,
      bottom: 48,
      containLabel: true,
      ...(option.grid as Record<string, unknown> | undefined),
    },
    tooltip: {
      ...(option.tooltip as Record<string, unknown> | undefined),
      backgroundColor: isDark ? "#2f2f2f" : "#ffffff",
      borderColor: axisLineColor,
      textStyle: {
        color: textColor,
        ...((option.tooltip as Record<string, unknown>)?.textStyle as Record<string, unknown> | undefined),
      },
    },
    xAxis: applyAxisTheme(option.xAxis, textColor, axisLineColor, splitLineColor),
    yAxis: applyAxisTheme(option.yAxis, textColor, axisLineColor, splitLineColor),
  };

  // Apply glass-bar gradient to bar series
  const themedSeries = themed.series;
  if (Array.isArray(themedSeries)) {
    const hasBar = themedSeries.some((s) => (s as Record<string, unknown>).type === "bar");
    if (hasBar) {
      themed.series = applyGlassBarStyle(
        themedSeries as Record<string, unknown>[],
        isDark,
        ACCENT_PALETTE
      );
    }
  }

  // Apply label styling to pie/donut/funnel/treemap series
  if (Array.isArray(themed.series)) {
    themed.series = (themed.series as Record<string, unknown>[]).map((s) => {
      const type = s.type as string;
      if (type === "pie") {
        // Only override center/radius if the widget didn't set them
        const hasCustomCenter = Array.isArray(s.center) && s.center[0] !== "50%";
        return {
          ...s,
          ...(!hasCustomCenter && { center: ["50%", "55%"] }),
          radius: s.radius || ["30%", "60%"],
          label: s.label ?? { show: false },
          labelLine: { show: false },
          emphasis: {
            label: { show: false },
            ...(s.emphasis as Record<string, unknown> | undefined),
          },
        };
      }
      if (type === "line") {
        return {
          ...s,
          symbol: s.symbol ?? "none",
          lineStyle: { width: 2.5, ...(s.lineStyle as Record<string, unknown> | undefined) },
          emphasis: {
            lineStyle: { width: 3 },
            ...(s.emphasis as Record<string, unknown> | undefined),
          },
        };
      }
      if (type === "funnel" || type === "treemap") {
        return {
          ...s,
          label: {
            color: textColor,
            ...(s.label as Record<string, unknown> | undefined),
          },
        };
      }
      return s;
    });
    const seriesArr = themed.series as Record<string, unknown>[];
    const hasPie = seriesArr.some((s) => s.type === "pie");
    const hasMultiBarLegend = !hasPie && extractBarLegendData(themed, ACCENT_PALETTE) !== null;

    // Hide default legend and left-align title when we render a custom table
    // But respect explicit legend.show = true set by the caller (e.g. dashboard widgets)
    const callerLegendShow = (option.legend as Record<string, unknown> | undefined)?.show;
    if (hasPie || (hasMultiBarLegend && callerLegendShow !== true)) {
      (themed.legend as Record<string, unknown>).show = false;
      (themed.title as Record<string, unknown>).left = "4%";
      (themed.title as Record<string, unknown>).top = 8;
    }
  }

  // Apply special sankey styling on top (with cycle removal)
  if (isSankeyChart(option)) {
    // Remove cycles from sankey data before styling
    const series = themed.series;
    if (Array.isArray(series)) {
      themed.series = series.map((s) =>
        (s as Record<string, unknown>).type === "sankey" ? removeSankeyCycles(s) : s
      );
    } else if (series && (series as Record<string, unknown>).type === "sankey") {
      themed.series = removeSankeyCycles(series);
    }
    themed = applySankeyTheme(themed, isDark);
  }

  return themed;
}

function applyAxisTheme(
  axis: unknown,
  textColor: string,
  axisLineColor: string,
  splitLineColor: string
): unknown {
  if (!axis) return axis;
  if (Array.isArray(axis)) {
    return axis.map((a) => mergeAxisStyle(a, textColor, axisLineColor, splitLineColor));
  }
  return mergeAxisStyle(axis as Record<string, unknown>, textColor, axisLineColor, splitLineColor);
}

function mergeAxisStyle(
  axis: Record<string, unknown>,
  textColor: string,
  axisLineColor: string,
  splitLineColor: string
): Record<string, unknown> {
  return {
    ...axis,
    name: undefined,
    axisLabel: {
      ...(axis.axisLabel as Record<string, unknown> | undefined),
      color: textColor,
      fontSize: 11,
    },
    axisTick: { show: false, ...(axis.axisTick as Record<string, unknown> | undefined) },
    axisPointer: { label: { show: false }, ...(axis.axisPointer as Record<string, unknown> | undefined) },
    axisLine: {
      ...(axis.axisLine as Record<string, unknown> | undefined),
      lineStyle: {
        color: axisLineColor,
        ...((axis.axisLine as Record<string, unknown>)?.lineStyle as Record<string, unknown> | undefined),
      },
    },
    splitLine: {
      ...(axis.splitLine as Record<string, unknown> | undefined),
      lineStyle: {
        color: splitLineColor,
        ...((axis.splitLine as Record<string, unknown>)?.lineStyle as Record<string, unknown> | undefined),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Pie table legend helpers
// ---------------------------------------------------------------------------

export interface PieSlice {
  name: string;
  value: number;
  color: string;
}

export function extractPieData(option: Record<string, unknown>, palette: string[]): PieSlice[] | null {
  const series = option.series;
  if (!series) return null;
  const arr = Array.isArray(series) ? series : [series];
  const pieSeries = arr.find((s: Record<string, unknown>) => s.type === "pie") as Record<string, unknown> | undefined;
  if (!pieSeries) return null;
  const data = pieSeries.data as Array<{ name: string; value: number; itemStyle?: { color?: string } }> | undefined;
  if (!data || !Array.isArray(data)) return null;
  return data.map((d, i) => ({
    name: d.name || `Item ${i + 1}`,
    value: typeof d.value === "number" ? d.value : Number(d.value) || 0,
    color: d.itemStyle?.color || palette[i % palette.length],
  }));
}

export function getPieMetricLabel(option: Record<string, unknown>): string {
  // Try to infer the metric name from the title
  const title = option.title as Record<string, unknown> | undefined;
  const text = (title?.text as string) || "";
  const lower = text.toLowerCase();
  if (lower.includes("user")) return "Users";
  if (lower.includes("session")) return "Sessions";
  if (lower.includes("pageview")) return "Pageviews";
  if (lower.includes("revenue") || lower.includes("spend") || lower.includes("cost")) return "Value";
  if (lower.includes("click")) return "Clicks";
  if (lower.includes("impression")) return "Impressions";
  if (lower.includes("conversion")) return "Conversions";
  return "Value";
}

interface BarLegendEntry {
  name: string;
  value: number;
  color: string;
}

export function extractBarLegendData(option: Record<string, unknown>, palette: string[]): BarLegendEntry[] | null {
  const series = option.series;
  if (!series || !Array.isArray(series)) return null;
  const barSeries = series.filter((s: Record<string, unknown>) => s.type === "bar" || s.type === "line");
  // Only show table legend when there are 2+ named series
  if (barSeries.length < 2) return null;
  const hasNames = barSeries.every((s: Record<string, unknown>) => s.name);
  if (!hasNames) return null;
  return barSeries.map((s: Record<string, unknown>, i: number) => {
    const data = s.data as number[] | Array<{ value: number }> | undefined;
    let total = 0;
    if (Array.isArray(data)) {
      total = data.reduce((sum: number, d) => {
        const v = typeof d === "number" ? d : (d as { value: number })?.value || 0;
        return sum + v;
      }, 0);
    }
    return {
      name: (s.name as string) || `Series ${i + 1}`,
      value: total,
      color: (s.itemStyle as Record<string, unknown>)?.color as string || palette[i % palette.length],
    };
  });
}

export interface ChartRendererHandle {
  getDataURL: () => string | null;
}

interface ChartRendererProps {
  option: Record<string, unknown>;
  /** Optional CSS style override (e.g. for dashboard widgets that control their own size) */
  styleOverride?: React.CSSProperties;
}

const ChartRenderer = forwardRef<ChartRendererHandle, ChartRendererProps>(
  function ChartRenderer({ option, styleOverride }, ref) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const [error, setError] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(!needsWorldMap(option));
    const chartRef = useRef<ReactEChartsCore>(null);

    useImperativeHandle(ref, () => ({
      getDataURL() {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return null;
        return instance.getDataURL({
          type: "png",
          pixelRatio: 2,
          backgroundColor: "transparent",
        });
      },
    }));

    useEffect(() => {
      if (!needsWorldMap(option)) {
        setMapReady(true);
        return;
      }
      ensureWorldMap()
        .then(() => setMapReady(true))
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load map"));
    }, [option]);

    const themedOption = useMemo(() => applyTheme(option, isDark), [option, isDark]);
    const isSankey = useMemo(() => isSankeyChart(option), [option]);
    const pieData = useMemo(() => extractPieData(themedOption, ACCENT_PALETTE), [themedOption]);
    const pieMetricLabel = useMemo(() => getPieMetricLabel(option), [option]);
    const barLegendData = useMemo(() => !pieData ? extractBarLegendData(themedOption, ACCENT_PALETTE) : null, [themedOption, pieData]);
    const chartHeight = isSankey ? "520px" : "400px";

    if (error) {
      return (
        <div
          className="flex items-center justify-center rounded-xl border px-4 py-8 text-sm"
          style={{
            borderColor: "var(--border-color)",
            color: "var(--text-secondary)",
            background: "var(--bg-tertiary)",
          }}
        >
          Chart could not be rendered: {error}
        </div>
      );
    }

    if (!mapReady) {
      return (
        <div
          className="flex items-center justify-center px-4 py-8 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Loading map...
        </div>
      );
    }

    // Pie/donut: side-by-side chart + table legend
    if (pieData && !styleOverride) {
      const total = pieData.reduce((sum, d) => sum + d.value, 0);
      return (
        <div className="flex" style={{ width: "100%", height: chartHeight }}>
          <div style={{ flex: "1 1 55%", minWidth: 0 }}>
            <ReactEChartsCore
              ref={chartRef}
              echarts={echarts}
              option={themedOption}
              style={{ width: "100%", height: "100%" }}
              opts={{ devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 2 }}
              notMerge
              lazyUpdate
            />
          </div>
          <div className="flex items-end justify-end" style={{ flex: "0 0 auto", padding: "24px 8px 24px 0" }}>
            <table
              className="rounded-lg text-sm"
              style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr>
                  <th
                    className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}
                  >
                    Channel
                  </th>
                  <th
                    className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}
                  >
                    {pieMetricLabel}
                  </th>
                  <th
                    className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}
                  >
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {pieData.map((d, i) => (
                  <tr key={i}>
                    <td
                      className="flex items-center gap-2 px-4 py-2 text-[13px]"
                      style={{ color: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: d.color }}
                      />
                      {d.name}
                    </td>
                    <td
                      className="px-4 py-2 text-right text-[13px] tabular-nums"
                      style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}
                    >
                      {d.value.toLocaleString()}
                    </td>
                    <td
                      className="px-4 py-2 text-right text-[13px] tabular-nums"
                      style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}
                    >
                      {total > 0 ? `${((d.value / total) * 100).toFixed(1)}%` : "0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    className="px-4 py-2 text-[13px] font-semibold"
                    style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}
                  >
                    Total
                  </td>
                  <td
                    className="px-4 py-2 text-right text-[13px] font-semibold tabular-nums"
                    style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}
                  >
                    {total.toLocaleString()}
                  </td>
                  <td
                    className="px-4 py-2 text-right text-[13px] font-semibold tabular-nums"
                    style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}
                  >
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      );
    }

    // Bar/line with multiple named series: chart left + table legend right
    if (barLegendData && !styleOverride) {
      const total = barLegendData.reduce((sum, d) => sum + d.value, 0);
      return (
        <div className="flex" style={{ width: "100%", height: chartHeight }}>
          <div style={{ flex: "1 1 55%", minWidth: 0 }}>
            <ReactEChartsCore
              ref={chartRef}
              echarts={echarts}
              option={themedOption}
              style={{ width: "100%", height: "100%" }}
              opts={{ devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 2 }}
              notMerge
              lazyUpdate
            />
          </div>
          <div className="flex items-end justify-end" style={{ flex: "0 0 auto", padding: "24px 8px 24px 0" }}>
            <table
              className="rounded-lg text-sm"
              style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr>
                  <th
                    className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}
                  >
                    Series
                  </th>
                  <th
                    className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}
                  >
                    Total
                  </th>
                  <th
                    className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}
                  >
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {barLegendData.map((d, i) => (
                  <tr key={i}>
                    <td
                      className="flex items-center gap-2 px-4 py-2 text-[13px]"
                      style={{ color: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}
                    >
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </td>
                    <td
                      className="px-4 py-2 text-right text-[13px] tabular-nums"
                      style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}
                    >
                      {d.value.toLocaleString()}
                    </td>
                    <td
                      className="px-4 py-2 text-right text-[13px] tabular-nums"
                      style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}
                    >
                      {total > 0 ? `${((d.value / total) * 100).toFixed(1)}%` : "0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return (
      <ReactEChartsCore
        ref={chartRef}
        echarts={echarts}
        option={themedOption}
        style={styleOverride ?? { width: "100%", height: chartHeight }}
        opts={{ devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 2 }}
        notMerge
        lazyUpdate
      />
    );
  }
);

export default ChartRenderer;
