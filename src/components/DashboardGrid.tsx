"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveGridLayout,
  type LayoutItem,
  type Layout,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import DashboardWidget from "./DashboardWidget";

interface Widget {
  id: string;
  widgetType: string;
  title: string;
  prompt: string;
  displayConfig: unknown;
  cachedData: unknown;
  cachedAt: string | null;
}

interface DashboardGridProps {
  layout: LayoutItem[];
  widgets: Widget[];
  dashboardId: string;
  onLayoutChange: (layout: LayoutItem[]) => void;
  onDeleteWidget: (widgetId: string) => void;
  onEditWidget: (widgetId: string, prompt: string) => void;
  refreshing?: boolean;
  kpiTargets?: { name: string; targetValue: number; targetDirection: string; cachedValue: number | null; displayFormat: string }[];
}

/** Fixed sizes per widget type — single source of truth */
function getFixedSize(widget: Widget): { w: number; h: number } {
  if (widget.widgetType === "scorecard") return { w: 4, h: 2 };
  if (widget.widgetType === "table") return { w: 12, h: 4 };
  if (widget.widgetType === "generating") return { w: 6, h: 4 };
  if (widget.widgetType === "chart" && widget.displayConfig) {
    const config = widget.displayConfig as Record<string, unknown>;
    const series = config.series;
    const seriesArr = Array.isArray(series) ? series : series ? [series] : [];
    const chartType = (seriesArr[0] as Record<string, unknown>)?.type as string | undefined;
    if (chartType === "sankey" || chartType === "map") return { w: 12, h: 5 };
    if (chartType === "pie") return { w: 6, h: 4 };
    return { w: 6, h: 4 };
  }
  return { w: 6, h: 4 };
}

export default function DashboardGrid({ layout, widgets, dashboardId, onLayoutChange, onDeleteWidget, onEditWidget, refreshing, kpiTargets }: DashboardGridProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const layoutFromProps = useRef(layout);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const measure = () => {
      const w = node.offsetWidth;
      if (w > 0) {
        setWidth(w);
        if (!mounted) setMounted(true);
      }
    };

    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(node);

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const widgetMap = new Map(widgets.map((w) => [w.id, w]));

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      // Re-enforce fixed sizes (user can only change position, not size)
      const enforced = newLayout.map((item) => {
        const widget = widgetMap.get(item.i);
        if (!widget) return item;
        const size = getFixedSize(widget);
        return { ...item, w: size.w, h: size.h };
      });

      // Only persist if the user actually dragged (position changed).
      const prev = layoutFromProps.current;
      const changed = enforced.some((item) => {
        const old = prev.find((p) => p.i === item.i);
        if (!old) return true;
        return old.x !== item.x || old.y !== item.y;
      }) || enforced.length !== prev.length;

      if (!changed) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onLayoutChange([...enforced]);
      }, 500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onLayoutChange, widgetMap]
  );

  // Normalize layout: enforce fixed sizes per widget type, keep positions
  const normalizedLayout = useMemo(() => {
    return layout.map((item) => {
      const widget = widgetMap.get(item.i);
      if (!widget) return item;
      const size = getFixedSize(widget);
      return { ...item, w: size.w, h: size.h };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, widgets]);

  layoutFromProps.current = normalizedLayout;

  // Use the same layout for all breakpoints so sidebar open/close never
  // triggers a breakpoint switch that reflows the grid.
  const allLayouts = { lg: normalizedLayout, md: normalizedLayout, sm: normalizedLayout };

  return (
    <div ref={containerRef} className="w-full">
      {mounted && (
        <ResponsiveGridLayout
          className="dashboard-grid"
          layouts={allLayouts}
          breakpoints={{ lg: 1200, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 12, sm: 12 }}
          rowHeight={80}
          width={width}
          margin={[16, 16] as const}
          containerPadding={[0, 0] as const}
          onLayoutChange={handleLayoutChange}
          dragConfig={{ handle: ".widget-drag-handle" }}
          compactType="vertical"
          isResizable={false}
        >
          {normalizedLayout.map((item) => {
            const widget = widgetMap.get(item.i);
            if (!widget) return <div key={item.i} />;
            return (
              <div key={item.i}>
                <DashboardWidget
                  widget={widget}
                  dashboardId={dashboardId}
                  onDelete={() => onDeleteWidget(widget.id)}
                  onEdit={(prompt) => onEditWidget(widget.id, prompt)}
                  refreshing={refreshing}
                  kpiTargets={kpiTargets}
                />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
