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
  dashboard: Dashboard;
}

export function EmbedDashboard({ dashboard }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [mounted, setMounted] = useState(false);

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

  const layout = (dashboard.layout as LayoutItem[]) || [];

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full p-4"
      style={{ background: "var(--background)" }}
    >
      {mounted && width > 0 && (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout, md: layout, sm: layout }}
          breakpoints={{ lg: 900, md: 600, sm: 0 }}
          cols={{ lg: 12, md: 6, sm: 1 }}
          rowHeight={80}
          width={width}
          isDraggable={false}
          isResizable={false}
          containerPadding={[0, 0]}
          margin={[12, 12]}
        >
          {dashboard.widgets.map((widget) => (
            <div key={widget.id}>
              <DashboardWidget
                widget={{ ...widget, prompt: "" }}
                dashboardId={dashboard.id}
                onDelete={() => {}}
                onEdit={() => {}}
                refreshing={false}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
