"use client";

import * as React from "react";
import { I } from "../icons";
import { Btn, IconBtn, MenuItem } from "../primitives";
import { PageShell } from "../PageShell";
import { EmptyState } from "../EmptyState";

interface DashboardSummary {
  id: string;
  title: string;
  dateRange: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: { widgets: number };
}

interface DashboardListPanelV2Props {
  onClose: () => void;
  onOpenDashboard: (id: string) => void;
  orgId: string | null;
  orgName?: string;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 14) return `${d} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function DashboardListPanelV2({
  onClose,
  onOpenDashboard,
  orgId,
  orgName,
}: DashboardListPanelV2Props) {
  const [dashboards, setDashboards] = React.useState<DashboardSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  const fetchDashboards = React.useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    fetch(`/api/dashboards?orgId=${orgId}`)
      .then((r) => r.json())
      .then((data) => setDashboards(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  React.useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  React.useEffect(() => {
    if (!menuOpenId) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      // Any click inside the currently-open row (kebab trigger or menu body)
      // should NOT close the menu. We identify it by the data-row-id attribute.
      if (t?.closest?.(`[data-row-id="${menuOpenId}"]`)) return;
      setMenuOpenId(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpenId]);

  async function handleCreate() {
    if (!orgId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, title: "Untitled Dashboard" }),
      });
      if (res.ok) {
        const dashboard = await res.json();
        onOpenDashboard(dashboard.id);
      }
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDashboards((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      /* ignore */
    }
  }

  // Empty + loading both render with no header so the empty hero feels like
  // its own page (matches Alerts). When dashboards exist, the standard
  // PageShell header with kicker + title + "New dashboard" action shows.
  if (loading) {
    return (
      <PageShell
        onBack={onClose}
        backLabel="Back to chat"
      >
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: "var(--v2-ink-muted)",
            fontSize: 13,
          }}
        >
          Loading dashboards…
        </div>
      </PageShell>
    );
  }

  if (dashboards.length === 0) {
    return (
      <PageShell
        onBack={onClose}
        backLabel="Back to chat"
      >
        <EmptyState
          size="hero"
          icon={<I.Grid size={26} stroke={1.5} />}
          title="No dashboards yet."
          description="Create a dashboard to build custom visualizations from your connected data."
          primaryAction={{
            label: creating ? "Creating…" : "Create dashboard",
            icon: <I.Plus size={14} />,
            disabled: creating || !orgId,
            onClick: handleCreate,
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      onBack={onClose}
      backLabel="Back to chat"
      kicker="Dashboards"
      title={orgName ? `${orgName} dashboards` : "Your boards"}
      actions={
        <Btn
          variant="primary"
          size="md"
          icon={<I.Plus size={13} />}
          disabled={creating || !orgId}
          onClick={handleCreate}
        >
          {creating ? "Creating…" : "New dashboard"}
        </Btn>
      }
    >
      <div className="kicker" style={{ marginBottom: 10 }}>
        All dashboards
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--v2-line)",
          borderRadius: 10,
          overflow: "hidden",
          background: "var(--v2-surface)",
        }}
      >
        {dashboards.map((d, i) => (
          <DashRow
            key={d.id}
            dashboard={d}
            first={i === 0}
            onOpen={() => onOpenDashboard(d.id)}
            onDelete={() => handleDelete(d.id)}
            menuOpen={menuOpenId === d.id}
            onToggleMenu={(e) => {
              e.stopPropagation();
              setMenuOpenId((id) => (id === d.id ? null : d.id));
            }}
          />
        ))}
      </div>
    </PageShell>
  );
}

function DashRow({
  dashboard,
  first,
  onOpen,
  onDelete,
  menuOpen,
  onToggleMenu,
}: {
  dashboard: DashboardSummary;
  first: boolean;
  onOpen: () => void;
  onDelete: () => void;
  menuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-row-id={dashboard.id}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="row-hover"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 110px 140px 40px",
        alignItems: "center",
        gap: 16,
        padding: "13px 16px",
        borderTop: first ? "none" : "1px solid var(--v2-line)",
        cursor: "pointer",
        transition: "background 120ms var(--v2-ease)",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            background: "var(--v2-surface-2)",
            border: "1px solid var(--v2-line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--v2-ink-muted)",
            flexShrink: 0,
          }}
        >
          <I.Grid size={14} />
        </div>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: "var(--v2-ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {dashboard.title || "Untitled Dashboard"}
        </div>
      </div>
      <div
        className="num"
        style={{
          fontSize: 11.5,
          color: "var(--v2-ink-muted)",
        }}
      >
        {dashboard._count.widgets} widget
        {dashboard._count.widgets === 1 ? "" : "s"}
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--v2-ink-muted)",
        }}
      >
        {relativeDate(dashboard.updatedAt)}
      </div>
      <IconBtn
        onClick={onToggleMenu}
        title="More"
        aria-expanded={menuOpen}
        icon={<I.More size={13} />}
      />

      {menuOpen && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 42,
            right: 8,
            zIndex: 20,
            minWidth: 160,
            padding: 5,
            background: "var(--v2-surface)",
            border: "1px solid var(--v2-line)",
            borderRadius: 10,
            boxShadow: "var(--v2-shadow-pop)",
            fontSize: 12.5,
          }}
        >
          <MenuItem
            danger
            icon={<I.X size={12.5} />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            Delete
          </MenuItem>
        </div>
      )}
    </div>
  );
}
