"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart, ScatterChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useTheme } from "./ThemeProvider";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
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

interface ChartRendererProps {
  option: Record<string, unknown>;
}

export default function ChartRenderer({ option }: ChartRendererProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const themedOption = useMemo(() => applyTheme(option, isDark), [option, isDark]);

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={themedOption}
      style={{ width: "100%", height: "400px" }}
      notMerge
      lazyUpdate
    />
  );
}
