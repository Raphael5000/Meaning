"use client";

import { useCallback, useRef } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
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
  onLayoutChange: (layout: LayoutItem[]) => void;
  onDeleteWidget: (widgetId: string) => void;
  refreshing?: boolean;
}

export default function DashboardGrid({ layout, widgets, onLayoutChange, onDeleteWidget, refreshing }: DashboardGridProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { width, containerRef, mounted } = useContainerWidth({});

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onLayoutChange([...newLayout]);
      }, 500);
    },
    [onLayoutChange]
  );

  const widgetMap = new Map(widgets.map((w) => [w.id, w]));

  return (
    <div ref={containerRef}>
      {mounted && (
        <ResponsiveGridLayout
          className="dashboard-grid"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 6, sm: 1 }}
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
                  onDelete={() => onDeleteWidget(widget.id)}
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
