"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
}

export default function DashboardGrid({ layout, widgets, dashboardId, onLayoutChange, onDeleteWidget, onEditWidget, refreshing }: DashboardGridProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const layoutFromProps = useRef(layout);
  layoutFromProps.current = layout;

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

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      // Only persist if the user actually dragged/resized (not from a breakpoint switch).
      // Compare against the props layout — if IDs and positions match, skip.
      const prev = layoutFromProps.current;
      const changed = newLayout.some((item) => {
        const old = prev.find((p) => p.i === item.i);
        if (!old) return true;
        return old.x !== item.x || old.y !== item.y || old.w !== item.w || old.h !== item.h;
      }) || newLayout.length !== prev.length;

      if (!changed) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onLayoutChange([...newLayout]);
      }, 500);
    },
    [onLayoutChange]
  );

  const widgetMap = new Map(widgets.map((w) => [w.id, w]));

  // Use the same layout for all breakpoints so sidebar open/close never
  // triggers a breakpoint switch that reflows the grid.
  const allLayouts = { lg: layout, md: layout, sm: layout };

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
        >
          {layout.map((item) => {
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
                />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
