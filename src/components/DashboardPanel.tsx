"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { LayoutItem } from "react-grid-layout";
import { Loader2, ArrowLeft, Plus, RefreshCw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardGrid from "./DashboardGrid";
import AddWidgetDialog from "./AddWidgetDialog";
import DateRangePicker from "./DateRangePicker";
import DashboardChatSidebar from "./DashboardChatSidebar";

interface Widget {
  id: string;
  widgetType: string;
  title: string;
  prompt: string;
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

interface DashboardPanelProps {
  dashboardId: string;
  onClose: () => void;
  orgId?: string | null;
}

export default function DashboardPanel({ dashboardId, onClose, orgId }: DashboardPanelProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [editWidgetId, setEditWidgetId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const hasRefreshedRef = useRef(false);

  const fetchDashboard = useCallback(() => {
    setLoading(true);
    fetch(`/api/dashboards/${dashboardId}`)
      .then((r) => r.json())
      .then((data) => {
        setDashboard(data);
        setTitleDraft(data.title);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dashboardId]);

  // Refresh all widget data. When silent=true, skip the loading skeleton overlay.
  const refreshWidgets = useCallback(async (dateRange?: string, dateFrom?: string | null, dateTo?: string | null, silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateRange, dateFrom, dateTo }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const results = data.results as Array<{ widgetId: string; rows: unknown; error?: string }>;

      // Update cached data on each widget
      setDashboard((d) => {
        if (!d) return d;
        const updatedWidgets = d.widgets.map((w) => {
          const result = results.find((r) => r.widgetId === w.id);
          if (result?.rows) {
            return { ...w, cachedData: result.rows, cachedAt: new Date().toISOString() };
          }
          return w;
        });
        return { ...d, widgets: updatedWidgets };
      });
    } catch {
      // ignore
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh on initial load — silently in the background (no skeletons).
  // Cached data is shown instantly; fresh data swaps in when ready.
  useEffect(() => {
    if (!dashboard || dashboard.widgets.length === 0 || hasRefreshedRef.current) return;
    hasRefreshedRef.current = true;
    refreshWidgets(dashboard.dateRange, dashboard.dateFrom, dashboard.dateTo, true);
  }, [dashboard, refreshWidgets]);

  async function saveTitle() {
    if (!dashboard || titleDraft === dashboard.title) {
      setEditingTitle(false);
      return;
    }
    setEditingTitle(false);
    setDashboard((d) => d ? { ...d, title: titleDraft } : d);
    await fetch(`/api/dashboards/${dashboardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleDraft }),
    }).catch(() => {});
  }

  function handleLayoutChange(newLayout: LayoutItem[]) {
    if (!dashboard) return;
    setDashboard((d) => d ? { ...d, layout: newLayout } : d);
    fetch(`/api/dashboards/${dashboardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: newLayout }),
    }).catch(() => {});
  }

  function handleDateRangeChange(dateRange: string, dateFrom?: string | null, dateTo?: string | null) {
    if (!dashboard) return;
    setDashboard((d) => d ? { ...d, dateRange, dateFrom: dateFrom ?? null, dateTo: dateTo ?? null } : d);
    // Save the new date range
    fetch(`/api/dashboards/${dashboardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateRange, dateFrom, dateTo }),
    }).catch(() => {});
    // Refresh all widgets with the new date range
    refreshWidgets(dateRange, dateFrom, dateTo);
  }

  async function handleAddWidget(prompt: string) {
    // Optimistic: add a placeholder widget immediately
    const tempId = `generating-${Date.now()}`;
    const placeholder: Widget = {
      id: tempId,
      widgetType: "generating",
      title: prompt,
      prompt,
      displayConfig: null,
      cachedData: null,
      cachedAt: null,
    };
    // Guess placeholder size from prompt keywords
    const lower = prompt.toLowerCase();
    const isScorecard = /\bhow many\b|\btotal\b|\bcount\b|\bhow much\b|\bwhat is the\b|\bwhat was\b/.test(lower) && !/\bby\b|\bper\b|\bbreakdown\b|\bchart\b|\bgraph\b|\btrend\b/.test(lower);
    const isSankey = /\bsankey\b|\bflow\b|\bjourney\b/.test(lower);
    const placeholderSize = isScorecard ? { w: 3, h: 2 } : isSankey ? { w: 12, h: 6 } : { w: 6, h: 4 };

    const maxBottom = (dashboard?.layout || []).reduce((max, item) => Math.max(max, item.y + item.h), 0);
    // Try side-by-side placement
    let placeholderX = 0;
    let placeholderY = maxBottom;
    if (dashboard?.layout && dashboard.layout.length > 0) {
      const lastRowY = Math.max(...dashboard.layout.map((item) => item.y));
      const lastRowItems = dashboard.layout.filter((item) => item.y === lastRowY);
      const lastRowRight = lastRowItems.reduce((max, item) => Math.max(max, item.x + item.w), 0);
      if (lastRowRight + placeholderSize.w <= 12) {
        placeholderX = lastRowRight;
        placeholderY = lastRowY;
      }
    }
    const placeholderLayout: LayoutItem = { i: tempId, x: placeholderX, y: placeholderY, ...placeholderSize };

    setDashboard((d) => {
      if (!d) return d;
      return {
        ...d,
        widgets: [...d.widgets, placeholder],
        layout: [...d.layout, placeholderLayout],
      };
    });
    setGeneratingIds((s) => new Set(s).add(tempId));

    // Fire API in background
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/widgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Remove placeholder on error
        setDashboard((d) => {
          if (!d) return d;
          return {
            ...d,
            widgets: d.widgets.filter((w) => w.id !== tempId),
            layout: d.layout.filter((l) => l.i !== tempId),
          };
        });
        throw new Error(data.error || "Failed to create widget");
      }
      const data = await res.json();
      const newWidget = data.widget as Widget;
      const newLayout = data.layout as LayoutItem[];

      // Swap placeholder with real widget — no full refetch
      setDashboard((d) => {
        if (!d) return d;
        return {
          ...d,
          widgets: d.widgets.filter((w) => w.id !== tempId).concat(newWidget),
          layout: newLayout,
        };
      });
    } finally {
      setGeneratingIds((s) => {
        const next = new Set(s);
        next.delete(tempId);
        return next;
      });
    }
  }

  function handleEditWidget(widgetId: string, prompt: string) {
    setEditWidgetId(widgetId);
    setEditPrompt(prompt);
    setAddWidgetOpen(true);
  }

  async function handleEditSubmit(newPrompt: string) {
    if (!editWidgetId) {
      // Normal add
      return handleAddWidget(newPrompt);
    }
    // Delete old widget, create new one with updated prompt
    await handleDeleteWidget(editWidgetId);
    setEditWidgetId(null);
    setEditPrompt("");
    return handleAddWidget(newPrompt);
  }

  async function handleDeleteWidget(widgetId: string) {
    if (!dashboard) return;
    setDashboard((d) => {
      if (!d) return d;
      return {
        ...d,
        widgets: d.widgets.filter((w) => w.id !== widgetId),
        layout: d.layout.filter((l) => l.i !== widgetId),
      };
    });
    await fetch(`/api/dashboards/${dashboardId}/widgets/${widgetId}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Dashboard not found</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Dashboard content — always full width, chat overlays on top */}
      <div className="flex w-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") { setTitleDraft(dashboard.title); setEditingTitle(false); }
                }}
                className="w-full rounded border border-border bg-transparent px-2 py-0.5 text-sm font-semibold text-foreground outline-none focus:border-[var(--accent)]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="truncate text-sm font-semibold text-foreground hover:underline"
              >
                {dashboard.title}
              </button>
            )}
          </div>
          <DateRangePicker
            dateRange={dashboard.dateRange}
            dateFrom={dashboard.dateFrom}
            dateTo={dashboard.dateTo}
            onChange={handleDateRangeChange}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => refreshWidgets(dashboard.dateRange, dashboard.dateFrom, dashboard.dateTo)}
            disabled={refreshing}
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs shrink-0"
            style={{ background: "var(--accent)", color: "white" }}
            onClick={() => { setEditWidgetId(null); setEditPrompt(""); setAddWidgetOpen(true); }}
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Add Widget
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setChatOpen((o) => !o)}
            title="Chat with your data"
            style={{
              background: chatOpen ? "var(--accent)" : undefined,
              color: chatOpen ? "white" : undefined,
            }}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>

        {/* Add Widget Dialog */}
        <AddWidgetDialog
          open={addWidgetOpen}
          onClose={() => { setAddWidgetOpen(false); setEditWidgetId(null); setEditPrompt(""); }}
          onSubmit={handleEditSubmit}
          initialPrompt={editPrompt}
        />

        {/* Grid area */}
        <div className="flex-1 overflow-y-auto px-2 py-4">
          {dashboard.widgets.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div
                className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: "var(--bg-secondary)" }}
              >
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-1 text-sm font-medium text-foreground">Empty dashboard</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Describe what you want to see and AI will create it.
              </p>
              <Button
                size="sm"
                className="h-8 text-xs"
                style={{ background: "var(--accent)", color: "white" }}
                onClick={() => { setEditWidgetId(null); setEditPrompt(""); setAddWidgetOpen(true); }}
              >
                <Plus className="mr-1.5 h-3 w-3" />
                Add your first widget
              </Button>
            </div>
          ) : (
            <DashboardGrid
              layout={dashboard.layout}
              widgets={dashboard.widgets}
              dashboardId={dashboardId}
              onLayoutChange={handleLayoutChange}
              onDeleteWidget={handleDeleteWidget}
              onEditWidget={handleEditWidget}
              refreshing={refreshing}
            />
          )}
        </div>
      </div>

      {/* Chat sidebar */}
      <DashboardChatSidebar
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        orgId={orgId ?? null}
      />
    </div>
  );
}
