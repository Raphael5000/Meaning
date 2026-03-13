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
  CanvasRenderer,
]);

const ACCENT_PALETTE = [
  "#10a37f",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
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

/** Apply vibrant styling to sankey series for the neon-gradient look */
function applySankeyTheme(
  option: Record<string, unknown>,
  isDark: boolean
): Record<string, unknown> {
  const textColor = isDark ? "#f0f0f0" : "#1a1a1a";
  const bubbleBg = isDark ? "rgba(22,22,35,0.85)" : "rgba(255,255,255,0.9)";
  const bubbleBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const series = option.series;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const styleSeries = (s: any) => {
    if (s.type !== "sankey") return s;

    // Assign colors to nodes if not already set
    const nodes = Array.isArray(s.data) ? s.data : s.nodes || [];
    const coloredNodes = nodes.map((node: Record<string, unknown>, i: number) => {
      const nodeColor = SANKEY_PALETTE[i % SANKEY_PALETTE.length];
      return {
        ...node,
        itemStyle: {
          color: nodeColor,
          borderColor: "transparent",
          borderWidth: 0,
          ...(node.itemStyle as Record<string, unknown> | undefined),
        },
        // Per-node label with colored accent dot
        label: {
          backgroundColor: bubbleBg,
          borderColor: bubbleBorder,
          borderWidth: 1,
          borderRadius: 8,
          padding: [8, 12],
          shadowColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)",
          shadowBlur: 12,
          rich: {
            name: {
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              color: textColor,
              padding: [0, 0, 2, 0],
            },
            value: {
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Inter', system-ui, sans-serif",
              color: nodeColor,
              padding: [2, 0, 0, 0],
            },
          },
        },
      };
    });

    return {
      ...s,
      data: coloredNodes,
      type: "sankey",
      layoutIterations: s.layoutIterations ?? 32,
      nodeWidth: s.nodeWidth ?? 8,
      nodeGap: s.nodeGap ?? 18,
      nodeAlign: s.nodeAlign ?? "justify",
      draggable: s.draggable ?? true,
      emphasis: {
        focus: "adjacency",
        lineStyle: { opacity: 0.65 },
        ...(s.emphasis as Record<string, unknown> | undefined),
      },
      lineStyle: {
        color: "gradient",
        opacity: 0.35,
        curveness: 0.5,
        ...(s.lineStyle as Record<string, unknown> | undefined),
      },
      label: {
        show: true,
        position: "right",
        formatter: (params: { name: string; value: number | string }) => {
          const val = typeof params.value === "number"
            ? params.value.toLocaleString()
            : params.value ?? "";
          return `{name|${params.name}}\n{value|${val}}`;
        },
        backgroundColor: bubbleBg,
        borderColor: bubbleBorder,
        borderWidth: 1,
        borderRadius: 8,
        padding: [8, 12],
        shadowColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)",
        shadowBlur: 12,
        rich: {
          name: {
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            color: textColor,
            padding: [0, 0, 2, 0],
          },
          value: {
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Inter', system-ui, sans-serif",
            color: isDark ? "#a78bfa" : "#7c3aed",
            padding: [2, 0, 0, 0],
          },
        },
        ...(s.label as Record<string, unknown> | undefined),
      },
      itemStyle: {
        borderRadius: 4,
        borderColor: "transparent",
        borderWidth: 0,
        ...(s.itemStyle as Record<string, unknown> | undefined),
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
      borderColor: isDark ? "rgba(139,92,246,0.3)" : "rgba(0,0,0,0.1)",
      borderWidth: 1,
      padding: [10, 14],
      textStyle: {
        color: textColor,
        fontSize: 13,
        fontFamily: "'Inter', system-ui, sans-serif",
      },
      extraCssText: isDark
        ? "backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,0.5);border-radius:10px;"
        : "backdrop-filter:blur(12px);box-shadow:0 4px 16px rgba(0,0,0,0.12);border-radius:10px;",
      ...(option.tooltip as Record<string, unknown> | undefined),
    },
  };
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
      ...(option.legend as Record<string, unknown> | undefined),
      textStyle: {
        color: textColor,
        ...((option.legend as Record<string, unknown>)?.textStyle as Record<string, unknown> | undefined),
      },
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

  // Apply special sankey styling on top
  if (isSankeyChart(option)) {
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
    axisLabel: {
      ...(axis.axisLabel as Record<string, unknown> | undefined),
      color: textColor,
    },
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

export interface ChartRendererHandle {
  getDataURL: () => string | null;
}

interface ChartRendererProps {
  option: Record<string, unknown>;
}

const ChartRenderer = forwardRef<ChartRendererHandle, ChartRendererProps>(
  function ChartRenderer({ option }, ref) {
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

    return (
      <ReactEChartsCore
        ref={chartRef}
        echarts={echarts}
        option={themedOption}
        style={{ width: "100%", height: chartHeight }}
        notMerge
        lazyUpdate
      />
    );
  }
);

export default ChartRenderer;
