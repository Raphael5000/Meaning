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

function applyTheme(
  option: Record<string, unknown>,
  isDark: boolean
): Record<string, unknown> {
  const textColor = isDark ? "#ececec" : "#1a1a1a";
  const subtextColor = isDark ? "#8e8e8e" : "#8e8e8e";
  const axisLineColor = isDark ? "#3a3a3a" : "#e0e0e0";
  const splitLineColor = isDark ? "#2f2f2f" : "#f0f0f0";

  return {
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
        style={{ width: "100%", height: "400px" }}
        notMerge
        lazyUpdate
      />
    );
  }
);

export default ChartRenderer;
