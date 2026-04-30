"use client";

import { useEffect, useRef, useState } from "react";
import {
  ResponsiveGridLayout,
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

  const layout = (active.layout as LayoutItem[]) || [];

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
            className="layout"
            layouts={{ lg: layout, md: layout, sm: layout }}
            breakpoints={{ lg: 900, md: 600, sm: 0 }}
            cols={{ lg: 12, md: 6, sm: 1 }}
            rowHeight={80}
            width={width - 32}
            isDraggable={false}
            isResizable={false}
            containerPadding={[0, 0]}
            margin={[12, 12]}
          >
            {active.widgets.map((widget) => (
              <div key={widget.id}>
                <DashboardWidget
                  widget={{ ...widget, prompt: "" }}
                  dashboardId={active.id}
                  onDelete={() => {}}
                  onEdit={() => {}}
                  refreshing={false}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
