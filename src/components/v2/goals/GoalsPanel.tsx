"use client";

import * as React from "react";
import { Plus, Trash2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Page, PageBody, PageHeader } from "../layout";
import { Button } from "@/components/ui/button";
import {
  KpiFormDialog,
  type KpiFormData,
  type KpiEditData,
} from "./KpiFormDialog";

interface Kpi {
  id: string;
  name: string;
  metricQuery: string;
  dataSourceType: string;
  targetValue: number;
  targetDirection: string;
  displayFormat: string;
  timePeriod: string;
  sortOrder: number;
  cachedValue: number | null;
  cachedAt: string | null;
  manualMetricId: string | null;
}

interface GoalsPanelProps {
  onClose?: () => void;
  orgId: string | null;
}

function formatValue(value: number, displayFormat: string): string {
  switch (displayFormat) {
    case "percentage":
      return `${(value * 100).toFixed(1)}%`;
    case "currency":
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    default:
      return value.toLocaleString();
  }
}

function getProgress(actual: number, target: number, direction: string): number {
  if (target === 0) return actual > 0 ? 100 : 0;
  if (direction === "below") {
    if (actual <= target) return 100;
    return Math.max(0, (2 * target - actual) / target * 100);
  }
  return Math.min(100, (actual / target) * 100);
}

function isOnTrack(actual: number, target: number, direction: string): boolean {
  if (direction === "below") return actual <= target;
  return actual >= target;
}

export default function GoalsPanel({ orgId }: GoalsPanelProps) {
  const [kpis, setKpis] = React.useState<Kpi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingKpi, setEditingKpi] = React.useState<Kpi | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kpis");
      if (!res.ok) throw new Error("Failed to load goals");
      const data = (await res.json()) as Kpi[];
      setKpis(Array.isArray(data) ? data : []);
    } catch {
      setKpis([]);
      toast.error("Could not load goals.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load, orgId]);

  // Auto-refresh once if any non-manual KPIs have no cached value
  const hasAutoRefreshed = React.useRef(false);
  React.useEffect(() => {
    if (
      !loading &&
      !hasAutoRefreshed.current &&
      kpis.length > 0 &&
      kpis.some((k) => !k.manualMetricId && k.cachedAt === null)
    ) {
      hasAutoRefreshed.current = true;
      refreshKpis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function refreshKpis() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/kpis/refresh", { method: "POST" });
      if (!res.ok) throw new Error("Refresh failed");
      await load();
      toast.success("KPIs refreshed.");
    } catch {
      toast.error("Could not refresh KPIs.");
    } finally {
      setRefreshing(false);
    }
  }

  async function createKpi(data: KpiFormData) {
    setSaving(true);
    try {
      const res = await fetch("/api/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Could not create goal");
      }
      const created = (await res.json()) as Kpi;
      setKpis((prev) => [...prev, created]);
      setDialogOpen(false);
      toast.success("Goal created.");
      // For query-backed KPIs, refresh after delay to pick up auto-executed value
      if (!created.manualMetricId) {
        setTimeout(() => load(), 3000);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function updateKpi(id: string, data: KpiEditData) {
    setSaving(true);
    try {
      const res = await fetch(`/api/kpis/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Could not save changes");
      }
      const updated = (await res.json()) as Kpi;
      setKpis((prev) => prev.map((k) => (k.id === id ? updated : k)));
      setDialogOpen(false);
      setEditingKpi(null);
      toast.success("Saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function deleteKpi(id: string) {
    try {
      const res = await fetch(`/api/kpis/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete goal");
      setKpis((prev) => prev.filter((k) => k.id !== id));
      toast.success("Goal deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <Page className="meaning-v2">
      <PageHeader
        breadcrumb={["Goals"]}
        actions={
          <div className="flex items-center gap-2">
            {kpis.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => refreshKpis()}
                disabled={refreshing}
              >
                <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setEditingKpi(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              Add goal
            </Button>
          </div>
        }
      />

      <PageBody contained="default" padding="default">
        <header className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
            Goals
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Define KPI targets so the AI can compare actual vs target in
            answers, charts, and email reports.
          </p>
        </header>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-lg border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : kpis.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-[13px] text-muted-foreground">
              No goals yet. Add your first KPI target to get started.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setEditingKpi(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              Add goal
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {kpis.map((kpi) => {
              const hasValue = kpi.cachedValue !== null && kpi.cachedValue !== undefined;
              const progress = hasValue
                ? getProgress(kpi.cachedValue!, kpi.targetValue, kpi.targetDirection)
                : null;
              const onTrack = hasValue
                ? isOnTrack(kpi.cachedValue!, kpi.targetValue, kpi.targetDirection)
                : null;

              return (
                <div
                  key={kpi.id}
                  className="group rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-foreground">
                          {kpi.name}
                        </span>
                        {onTrack !== null && (
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              onTrack
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-red-500/10 text-red-600"
                            }`}
                          >
                            {onTrack ? "On track" : "Off track"}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        {hasValue ? (
                          <>
                            <span className="text-[20px] font-semibold text-foreground">
                              {formatValue(kpi.cachedValue!, kpi.displayFormat)}
                            </span>
                            <span className="text-[12px] text-muted-foreground">
                              / {formatValue(kpi.targetValue, kpi.displayFormat)} target
                            </span>
                          </>
                        ) : (
                          <span className="text-[12px] text-muted-foreground">
                            Target: {formatValue(kpi.targetValue, kpi.displayFormat)}
                            {kpi.manualMetricId
                              ? " — log values in Connections → Manual data"
                              : refreshing
                                ? " — refreshing..."
                                : " — no data yet"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingKpi(kpi);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteKpi(kpi.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  {progress !== null && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${
                            onTrack ? "bg-emerald-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                      </div>
                      <div className="mt-0.5 text-right text-[10px] text-muted-foreground">
                        {progress.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageBody>

      <KpiFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingKpi(null);
        }}
        saving={saving}
        editData={editingKpi}
        onSave={createKpi}
        onUpdate={updateKpi}
      />
    </Page>
  );
}
