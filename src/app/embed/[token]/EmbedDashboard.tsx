"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  ResponsiveGridLayout,
  verticalCompactor,
  type LayoutItem,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import DashboardWidget from "@/components/DashboardWidget";

interface Widget {
  id: string;
  widgetType: string;
  title: string;
  displayConfig: unknown;
  cachedData: unknown;
  cachedAt: string | null;
}

interface Dashboard {
  id: string;
  title: string;
  layout: LayoutItem[];
  dateRange: string;
  dateFrom: string | null;
  dateTo: string | null;
  widgets: Widget[];
}

interface Props {
  dashboards: Dashboard[];
}

/** Fixed sizes per widget type — mirrors DashboardGrid.getFixedSize */
function getFixedSize(widget: Widget): { w: number; h: number } {
  if (widget.widgetType === "heading") return { w: 12, h: 2 };
  if (widget.widgetType === "divider") return { w: 12, h: 2 };
  if (widget.widgetType === "scorecard") return { w: 4, h: 4 };
  if (widget.widgetType === "table") {
    const dc = widget.displayConfig as Record<string, unknown> | null;
    const data = widget.cachedData ?? dc?.inlineData ?? dc?.data;
    const rowCount = Array.isArray(data) ? data.length : 5;
    const contentPx = 36 + 32 + rowCount * 37;
    const h = Math.max(4, Math.min(30, Math.ceil((contentPx + 16) / 36)));
    return { w: 12, h };
  }
  if (widget.widgetType === "chart" && widget.displayConfig) {
    const config = widget.displayConfig as Record<string, unknown>;
    const series = config.series;
    const seriesArr = Array.isArray(series) ? series : series ? [series] : [];
    const chartType = (seriesArr[0] as Record<string, unknown>)?.type as string | undefined;
    if (chartType === "sankey" || chartType === "map") return { w: 12, h: 12 };
    if (chartType === "pie") return { w: 6, h: 10 };
    return { w: 6, h: 10 };
  }
  return { w: 6, h: 10 };
}

export function EmbedDashboard({ dashboards }: Props) {
  const [activeId, setActiveId] = useState(dashboards[0]?.id);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [mounted, setMounted] = useState(false);

  const active = dashboards.find((d) => d.id === activeId) || dashboards[0];

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
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [mounted]);

  const widgetMap = useMemo(
    () => new Map(active.widgets.map((w) => [w.id, w])),
    [active.widgets]
  );

  // Normalize layout: enforce fixed sizes per widget type (mirrors DashboardGrid)
  const normalizedLayout = useMemo(() => {
    const rawLayout = (active.layout as LayoutItem[]) || [];
    return rawLayout.map((item) => {
      const widget = widgetMap.get(item.i);
      if (!widget) return { ...item, isResizable: false };
      const size = getFixedSize(widget);
      return { ...item, w: size.w, h: size.h, isResizable: false };
    });
  }, [active.layout, widgetMap]);

  const allLayouts = { lg: normalizedLayout, md: normalizedLayout, sm: normalizedLayout };

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full"
      style={{ background: "var(--background)" }}
    >
      {/* Tabs — only show if more than one dashboard */}
      {dashboards.length > 1 && (
        <div
          className="sticky top-0 z-10 flex items-center gap-1 px-4 py-3 border-b"
          style={{
            borderColor: "var(--border)",
            background: "var(--background)",
          }}
        >
          {dashboards.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveId(d.id)}
              className="rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors"
              style={{
                background: d.id === activeId ? "var(--muted)" : "transparent",
                color: d.id === activeId ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              {d.title}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="p-4">
        {mounted && width > 0 && (
          <ResponsiveGridLayout
            className="dashboard-grid"
            layouts={allLayouts}
            breakpoints={{ lg: 1200, md: 768, sm: 0 }}
            cols={{ lg: 12, md: 12, sm: 12 }}
            rowHeight={20}
            width={width}
            dragConfig={{ enabled: false }}
            resizeConfig={{ enabled: false }}
            containerPadding={[0, 0]}
            margin={[16, 16]}
            compactor={verticalCompactor}
          >
            {normalizedLayout.map((item) => {
              const widget = widgetMap.get(item.i);
              if (!widget) return <div key={item.i} />;
              return (
                <div key={item.i}>
                  <DashboardWidget
                    widget={{ ...widget, prompt: "" }}
                    dashboardId={active.id}
                    onDelete={() => {}}
                    onEdit={() => {}}
                    refreshing={false}
                    readOnly
                  />
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
