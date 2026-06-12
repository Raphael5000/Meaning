"use client";

import * as React from "react";
import type { LayoutItem } from "react-grid-layout";
import DashboardGrid from "@/components/DashboardGrid";
import { DashChatDock } from "./DashChatDock";
import { DashHeader } from "./DashHeader";
import { DashEmpty } from "./DashEmpty";
import { AddWidgetDialog, type ChartTypeId } from "./AddWidgetDialog";
import { I } from "../icons";
import { Btn } from "../primitives";

interface Widget {
  id: string;
  widgetType: string;
  title: string;
  prompt: string;
  displayConfig: unknown;
  cachedData: unknown;
  cachedAt: string | null;
  /** Transient field — populated from the most recent refresh call when a
   *  specific widget failed (disconnected source, bad SQL, timeout, etc). */
  lastError?: string | null;
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

interface DashboardPanelV2Props {
  dashboardId: string;
  onClose: () => void;
  orgId?: string | null;
}

function formatRelative(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export default function DashboardPanelV2({
  dashboardId,
  onClose,
  orgId,
}: DashboardPanelV2Props) {
  const [chatOpen, setChatOpen] = React.useState(false);
  const [dashboard, setDashboard] = React.useState<Dashboard | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState("");
  const [addWidgetOpen, setAddWidgetOpen] = React.useState(false);
  const [editWidgetId, setEditWidgetId] = React.useState<string | null>(null);
  const [editPrompt, setEditPrompt] = React.useState("");
  const [widgetError, setWidgetError] = React.useState<string | null>(null);
  const [erroredSources, setErroredSources] = React.useState<
    { type: string; label: string; errorMessage?: string | null; isPending?: boolean }[]
  >([]);
  const [kpiTargets, setKpiTargets] = React.useState<
    { name: string; targetValue: number; targetDirection: string; cachedValue: number | null; displayFormat: string }[]
  >([]);
  const hasRefreshedRef = React.useRef(false);

  // Fetch KPI targets for overlay on charts/scorecards
  React.useEffect(() => {
    if (!orgId) return;
    fetch("/api/kpis")
      .then((r) => r.json())
      .then((data: { name: string; targetValue: number; targetDirection: string; cachedValue: number | null; displayFormat: string }[]) => {
        if (Array.isArray(data)) setKpiTargets(data);
      })
      .catch(() => {});
  }, [orgId]);

  const fetchDashboard = React.useCallback(() => {
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

  const refreshWidgets = React.useCallback(
    async (
      dateRange?: string,
      dateFrom?: string | null,
      dateTo?: string | null,
      silent = false,
    ) => {
      if (!silent) setRefreshing(true);
      try {
        const res = await fetch(`/api/dashboards/${dashboardId}/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dateRange, dateFrom, dateTo }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const results = data.results as Array<{
          widgetId: string;
          rows: unknown;
          error?: string;
        }>;
        setDashboard((d) => {
          if (!d) return d;
          const updated = d.widgets.map((w) => {
            const r = results.find((r) => r.widgetId === w.id);
            if (!r) return w;
            if (r.error) {
              return { ...w, lastError: r.error };
            }
            if (r.rows) {
              return {
                ...w,
                cachedData: r.rows,
                cachedAt: new Date().toISOString(),
                lastError: null,
              };
            }
            return w;
          });
          return { ...d, widgets: updated };
        });
      } catch {
        /* ignore */
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [dashboardId],
  );

  React.useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Pull connector status so we can warn when a source the widgets rely on is
  // disconnected. Silent failure → no banner rather than a scary fetch error.
  React.useEffect(() => {
    if (!orgId) return;
    fetch(`/api/user/connections?orgId=${orgId}`)
      .then((r) => r.json())
      .then((data: { dataSources?: { type: string; status: string; lastSyncError?: string | null }[] }) => {
        const sources = data?.dataSources ?? [];
        const labels: Record<string, string> = {
          GA4_BIGQUERY: "Google Analytics",
          GOOGLE_ADS: "Google Ads",
          MICROSOFT_ADS: "Microsoft Ads",
          LINKEDIN: "LinkedIn",
          MAILCHIMP: "Mailchimp",
          SEARCH_CONSOLE: "Search Console",
        };
        const problematic = sources
          .filter((s) => s.status === "ERROR" || s.status === "PENDING")
          .map((s) => ({
            type: s.type,
            label: labels[s.type] ?? s.type,
            errorMessage:
              s.status === "PENDING"
                ? "Waiting for data — this can take up to 24 hours after connecting."
                : s.lastSyncError,
            isPending: s.status === "PENDING",
          }));
        setErroredSources(problematic);
      })
      .catch(() => setErroredSources([]));
  }, [orgId]);

  React.useEffect(() => {
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
    setDashboard((d) => (d ? { ...d, title: titleDraft } : d));
    await fetch(`/api/dashboards/${dashboardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleDraft }),
    }).catch(() => {});
  }

  function handleLayoutChange(newLayout: LayoutItem[]) {
    if (!dashboard) return;
    setDashboard((d) => (d ? { ...d, layout: newLayout } : d));
    fetch(`/api/dashboards/${dashboardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: newLayout }),
    }).catch(() => {});
  }

  async function handleAddWidget(args: { prompt: string; chartType: ChartTypeId; includeGoal?: boolean }) {
    const { prompt, chartType, includeGoal } = args;
    if (!dashboard) return;
    setWidgetError(null);
    // Close the dialog immediately so the user can see the in-flight placeholder
    // on the grid. The placeholder widget renders its own "Generating…" state.
    setAddWidgetOpen(false);
    setEditWidgetId(null);
    setEditPrompt("");

    // Optimistic placeholder
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
    const lower = prompt.toLowerCase();
    const isScorecard =
      /\bhow many\b|\btotal\b|\bcount\b|\bhow much\b|\bwhat is the\b|\bwhat was\b/.test(lower) &&
      !/\bby\b|\bper\b|\bbreakdown\b|\bchart\b|\bgraph\b|\btrend\b/.test(lower);
    const isSankey = /\bsankey\b|\bflow\b|\bjourney\b/.test(lower);
    const isTable =
      /\btable\b|\blist\b|\btop \d+\b/.test(lower) &&
      !/\bchart\b|\bgraph\b|\btrend\b|\bover time\b/.test(lower);
    const size =
      chartType === "scorecard" || isScorecard
        ? { w: 4, h: 2 }
        : chartType === "sankey" || isSankey
          ? { w: 12, h: 5 }
          : chartType === "table" || isTable
            ? { w: 12, h: 4 }
            : { w: 6, h: 4 };
    const maxBottom = (dashboard.layout || []).reduce(
      (m, it) => Math.max(m, it.y + it.h),
      0,
    );
    const placeholderLayout: LayoutItem = {
      i: tempId,
      x: 0,
      y: maxBottom,
      ...size,
    };
    setDashboard((d) =>
      d
        ? {
            ...d,
            widgets: [...d.widgets, placeholder],
            layout: [...d.layout, placeholderLayout],
          }
        : d,
    );

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);
      const res = await fetch(`/api/dashboards/${dashboardId}/widgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, chartType, includeGoal }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data.raw ? `\n\nAI response: ${data.raw}` : "";
        throw new Error(
          (data.error || data.message || `Server error (${res.status})`) + detail,
        );
      }
      const data = await res.json();
      const newWidget = data.widget as Widget;
      const newLayout = data.layout as LayoutItem[];
      setDashboard((d) =>
        d
          ? {
              ...d,
              widgets: d.widgets.filter((w) => w.id !== tempId).concat(newWidget),
              layout: newLayout,
            }
          : d,
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "AbortError"
            ? "Widget generation timed out. Try a simpler prompt."
            : err.message
          : "Failed to create widget";
      setWidgetError(msg);
      setDashboard((d) =>
        d
          ? {
              ...d,
              widgets: d.widgets.filter((w) => w.id !== tempId),
              layout: d.layout.filter((l) => l.i !== tempId),
            }
          : d,
      );
      setTimeout(() => setWidgetError(null), 8000);
    }
  }

  async function handleEditSubmit(args: { prompt: string; chartType: ChartTypeId }) {
    if (!editWidgetId) return handleAddWidget(args);
    await handleDeleteWidget(editWidgetId);
    setEditWidgetId(null);
    setEditPrompt("");
    return handleAddWidget(args);
  }

  async function handleDeleteWidget(widgetId: string) {
    if (!dashboard) return;
    setDashboard((d) =>
      d
        ? {
            ...d,
            widgets: d.widgets.filter((w) => w.id !== widgetId),
            layout: d.layout.filter((l) => l.i !== widgetId),
          }
        : d,
    );
    await fetch(`/api/dashboards/${dashboardId}/widgets/${widgetId}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  const [refreshingWidgetId, setRefreshingWidgetId] = React.useState<string | null>(null);

  async function handleRefreshWidget(widgetId: string) {
    if (!dashboard) return;
    setRefreshingWidgetId(widgetId);
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRange: dashboard.dateRange || "28d",
          dateFrom: dashboard.dateFrom,
          dateTo: dashboard.dateTo,
          widgetIds: [widgetId],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results) {
          setDashboard((d) => {
            if (!d) return d;
            const widgets = d.widgets.map((w) => {
              const result = data.results.find((r: { widgetId: string; rows: unknown }) => r.widgetId === w.id);
              if (result?.rows) return { ...w, cachedData: result.rows, cachedAt: new Date().toISOString() };
              return w;
            });
            return { ...d, widgets };
          });
        }
      }
    } catch { /* ignore */ }
    setRefreshingWidgetId(null);
  }

  function handleEditWidgetOpen(widgetId: string, prompt: string) {
    setEditWidgetId(widgetId);
    setEditPrompt(prompt);
    setAddWidgetOpen(true);
  }

  async function handleAddSimpleWidget(widgetType: "heading" | "divider") {
    if (!dashboard) return;
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/widgets/simple`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetType }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setDashboard((d) =>
        d ? { ...d, widgets: [...d.widgets, data.widget], layout: data.layout } : d
      );
    } catch { /* ignore */ }
  }

  // ---- render ----

  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--v2-ink-muted)",
          fontSize: 13,
        }}
      >
        Loading dashboard…
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--v2-ink-muted)",
          fontSize: 13,
        }}
      >
        Dashboard not found.
      </div>
    );
  }

  // Find the most recent cachedAt across widgets to compute "Refreshed X ago"
  const lastRefreshedIso = dashboard.widgets.reduce<string | null>((acc, w) => {
    if (!w.cachedAt) return acc;
    if (!acc) return w.cachedAt;
    return new Date(w.cachedAt) > new Date(acc) ? w.cachedAt : acc;
  }, null);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "var(--v2-bg)",
      }}
    >
      <DashHeader
        title={dashboard.title}
        lastRefreshed={formatRelative(lastRefreshedIso) ?? undefined}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((o) => !o)}
        onAddWidget={() => {
          setEditWidgetId(null);
          setEditPrompt("");
          setAddWidgetOpen(true);
        }}
        onBack={onClose}
        onRefresh={() =>
          refreshWidgets(dashboard.dateRange, dashboard.dateFrom, dashboard.dateTo)
        }
        refreshing={refreshing}
        editingTitle={editingTitle}
        titleDraft={titleDraft}
        onEditTitle={() => setEditingTitle(true)}
        onTitleDraftChange={setTitleDraft}
        onTitleCommit={saveTitle}
        trailing={null}
      />

      {/* Connector-error banner — one row per disconnected source */}
      {erroredSources.length > 0 && (
        <div
          style={{
            margin: "10px 20px 0",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {erroredSources.map((s) => (
            <div
              key={s.type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 8,
                background: "var(--v2-neg-bg)",
                border: "1px solid var(--v2-line)",
                fontSize: 12.5,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "var(--v2-surface)",
                  border: "1px solid var(--v2-line)",
                  color: s.isPending ? "var(--v2-ink-muted)" : "var(--v2-neg)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <I.Alert size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--v2-ink)",
                  }}
                >
                  {s.label} {s.isPending ? "— waiting for data" : "disconnected"}
                </div>
                {s.errorMessage && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--v2-ink-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 1,
                    }}
                    title={s.errorMessage}
                  >
                    {s.errorMessage}
                  </div>
                )}
              </div>
              <Btn
                variant="outline"
                size="sm"
                icon={<I.Plug size={12} />}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("v2:navigate", {
                      detail: {
                        panel: "connections",
                        initialSourceType: s.type,
                      },
                    }),
                  );
                }}
                style={{ flexShrink: 0 }}
              >
                Reconnect
              </Btn>
            </div>
          ))}
        </div>
      )}

      {/* Widget error banner */}
      {widgetError && (
        <div
          style={{
            margin: "8px 20px 0",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--v2-neg-bg)",
            color: "var(--v2-ink)",
            fontSize: 12.5,
            border: "1px solid var(--v2-line)",
          }}
        >
          <I.Alert size={14} style={{ color: "var(--v2-neg)", flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{widgetError}</span>
          <Btn
            variant="ghost"
            size="xs"
            onClick={() => setWidgetError(null)}
          >
            Dismiss
          </Btn>
        </div>
      )}

      {/* Grid area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          padding: dashboard.widgets.length === 0 ? 0 : "18px 24px",
        }}
      >
        {dashboard.widgets.length === 0 ? (
          <DashEmpty
            onCta={() => {
              setEditWidgetId(null);
              setEditPrompt("");
              setAddWidgetOpen(true);
            }}
          />
        ) : (
          <DashboardGrid
            layout={dashboard.layout}
            widgets={dashboard.widgets}
            dashboardId={dashboardId}
            onLayoutChange={handleLayoutChange}
            onDeleteWidget={handleDeleteWidget}
            onEditWidget={handleEditWidgetOpen}
            onRefreshWidget={handleRefreshWidget}
            refreshing={refreshing}
            refreshingWidgetId={refreshingWidgetId}
            kpiTargets={kpiTargets}
          />
        )}
      </div>

      <AddWidgetDialog
        open={addWidgetOpen}
        onClose={() => {
          setAddWidgetOpen(false);
          setEditWidgetId(null);
          setEditPrompt("");
        }}
        onSubmit={handleEditSubmit}
        initialPrompt={editPrompt}
        busy={false}
        error={widgetError}
        title={editWidgetId ? "Edit widget" : "Describe a new widget"}
        submitLabel={editWidgetId ? "Save changes" : "Generate widget"}
        onAddSimple={(type) => handleAddSimpleWidget(type)}
      />


      {/* Chat dock — absolute overlay with soft scrim so content keeps full width */}
      {chatOpen && (
        <div
          aria-hidden="true"
          onClick={() => setChatOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 29,
            background: "color-mix(in oklab, var(--v2-bg) 35%, transparent)",
            backdropFilter: "blur(1px)",
          }}
        />
      )}
      <DashChatDock
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        orgId={orgId ?? null}
        context={
          dashboard.widgets.length > 0
            ? `${dashboard.widgets.length} widget${dashboard.widgets.length === 1 ? "" : "s"}`
            : undefined
        }
      />
    </div>
  );
}

