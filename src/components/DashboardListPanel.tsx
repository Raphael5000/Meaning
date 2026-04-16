"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, ArrowLeft, Plus, LayoutDashboard, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardSummary {
  id: string;
  title: string;
  dateRange: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: { widgets: number };
}

interface DashboardListPanelProps {
  onClose: () => void;
  onOpenDashboard: (id: string) => void;
  orgId: string | null;
  orgName?: string;
}

export default function DashboardListPanel({ onClose, onOpenDashboard, orgId, orgName }: DashboardListPanelProps) {
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchDashboards = useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    fetch(`/api/dashboards?orgId=${orgId}`)
      .then((r) => r.json())
      .then((data) => setDashboards(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

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
      // ignore
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    try {
      await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
      setDashboards((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // ignore
    }
  }

  // Drag-to-reorder state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const reordered = [...dashboards];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    setDashboards(reordered);
    dragItem.current = null;
    dragOverItem.current = null;

    // Persist order
    fetch("/api/dashboards/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((d) => d.id) }),
    }).catch(() => {});
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Dashboards</h2>
          <p className="text-xs text-muted-foreground">
            {orgName ? `Dashboards for ${orgName}` : "Create and manage dashboards"}
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs"
          style={{ background: "var(--accent)", color: "white" }}
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Plus className="mr-1.5 h-3 w-3" />}
          New
        </Button>
      </div>

      {/* Dashboard list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-2">
          {dashboards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <LayoutDashboard className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-1 text-sm font-medium text-foreground">No dashboards yet</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Create a dashboard to build custom visualizations.
              </p>
              <Button
                size="sm"
                className="h-8 text-xs"
                style={{ background: "var(--accent)", color: "white" }}
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Plus className="mr-1.5 h-3 w-3" />}
                Create Dashboard
              </Button>
            </div>
          ) : (
            dashboards.map((d, i) => (
              <div
                key={d.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragEnter={() => handleDragEnter(i)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left transition-colors hover:border-[var(--accent)]"
                style={{ borderColor: "var(--border-color)", background: "var(--card-bg, var(--bg-secondary, transparent))" }}
              >
                <div className="flex shrink-0 cursor-grab items-center text-muted-foreground active:cursor-grabbing">
                  <GripVertical className="h-4 w-4" />
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDashboard(d.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <LayoutDashboard className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{d.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d._count.widgets} widget{d._count.widgets !== 1 ? "s" : ""}
                      {" · "}
                      {new Date(d.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(e, d.id); }}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
