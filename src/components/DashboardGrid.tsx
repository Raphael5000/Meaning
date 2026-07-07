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
  onRefreshWidget?: (widgetId: string) => void;
  refreshing?: boolean;
  refreshingWidgetId?: string | null;
  kpiTargets?: { name: string; targetValue: number; targetDirection: string; cachedValue: number | null; displayFormat: string }[];
}

/** Fixed sizes per widget type — single source of truth */
function getFixedSize(widget: Widget, isFullWidth?: boolean): { w: number; h: number } {
  if (widget.widgetType === "heading") return { w: 12, h: 2 };
  if (widget.widgetType === "divider") return { w: 12, h: 2 };
  if (widget.widgetType === "scorecard") return { w: 3, h: 3 };
  if (widget.widgetType === "table") {
    // Auto-size: widget header ~36px + table header ~32px + rows ~37px each
    // Grid: h * 20 + (h-1) * 16 = h * 36 - 16
    const dc = widget.displayConfig as Record<string, unknown> | null;
    const data = widget.cachedData ?? dc?.inlineData ?? dc?.data;
    const rowCount = Array.isArray(data) ? data.length : 5;
    const contentPx = 36 + 32 + rowCount * 37;
    const h = Math.max(4, Math.min(30, Math.ceil((contentPx + 16) / 36)));
    // Tables default to full width; toggle makes them half
    const w = isFullWidth ? 6 : 12;
    return { w, h };
  }
  if (widget.widgetType === "generating") return { w: 6, h: 10 };
  if (widget.widgetType === "chart" && widget.displayConfig) {
    const config = widget.displayConfig as Record<string, unknown>;
    const series = config.series;
    const seriesArr = Array.isArray(series) ? series : series ? [series] : [];
    const chartType = (seriesArr[0] as Record<string, unknown>)?.type as string | undefined;
    if (chartType === "sankey" || chartType === "map") return { w: 12, h: 12 };
    if (isFullWidth) return { w: 12, h: 12 };
    if (chartType === "pie") return { w: 6, h: 10 };
    return { w: 6, h: 10 };
  }
  return { w: 6, h: 10 };
}

/** Widget types that support width toggle */
function canToggleWidth(widget: Widget): boolean {
  if (widget.widgetType === "table") return true;
  if (widget.widgetType !== "chart" || !widget.displayConfig) return false;
  const config = widget.displayConfig as Record<string, unknown>;
  const series = config.series;
  const seriesArr = Array.isArray(series) ? series : series ? [series] : [];
  const chartType = (seriesArr[0] as Record<string, unknown>)?.type as string | undefined;
  return chartType !== "sankey" && chartType !== "map";
}

export default function DashboardGrid({ layout, widgets, dashboardId, onLayoutChange, onDeleteWidget, onEditWidget, onRefreshWidget, refreshing, refreshingWidgetId, kpiTargets }: DashboardGridProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const layoutFromProps = useRef(layout);

  // Track which chart widgets are expanded to full width
  // Derive initial state from layout (w >= 12 for chart widgets = full width)
  const [fullWidthIds, setFullWidthIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const item of layout) {
      if (item.w >= 12) {
        const widget = widgets.find((w) => w.id === item.i);
        if (widget && canToggleWidth(widget)) ids.add(item.i);
      }
    }
    return ids;
  });

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
        if (!widget) return { ...item, isResizable: false };
        const size = getFixedSize(widget, fullWidthIds.has(item.i));
        return { ...item, w: size.w, h: size.h, isResizable: false };
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

  const toggleFullWidth = useCallback((widgetId: string) => {
    setFullWidthIds((prev) => {
      const next = new Set(prev);
      if (next.has(widgetId)) next.delete(widgetId);
      else next.add(widgetId);
      return next;
    });
  }, []);

  // Normalize layout: enforce fixed sizes per widget type, disable resize
  const normalizedLayout = useMemo(() => {
    return layout.map((item) => {
      const widget = widgetMap.get(item.i);
      if (!widget) return { ...item, isResizable: false };
      const size = getFixedSize(widget, fullWidthIds.has(item.i));
      return { ...item, w: size.w, h: size.h, isResizable: false };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, widgets, fullWidthIds]);

  layoutFromProps.current = normalizedLayout;

  // Persist layout when full-width is toggled
  useEffect(() => {
    onLayoutChange(normalizedLayout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullWidthIds]);

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
          rowHeight={20}
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
                  refreshing={refreshing || refreshingWidgetId === widget.id}
                  kpiTargets={(widget.displayConfig as Record<string, unknown> | null)?._includeGoal ? kpiTargets : undefined}
                  canToggleWidth={canToggleWidth(widget)}
                  isFullWidth={fullWidthIds.has(widget.id)}
                  onToggleWidth={() => toggleFullWidth(widget.id)}
                  onRefresh={onRefreshWidget ? () => onRefreshWidget(widget.id) : undefined}
                />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
