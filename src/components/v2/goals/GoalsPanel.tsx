"use client";

import * as React from "react";
import { Plus, Trash2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Page, PageBody, PageHeader } from "../layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

/* ── Formatting helpers ── */

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

type GoalStatus = "on" | "risk" | "off";

function getStatus(actual: number, target: number, direction: string): GoalStatus {
  const pct = getProgress(actual, target, direction);
  if (pct >= 90) return "on";
  if (pct >= 60) return "risk";
  return "off";
}

const STATUS_CONFIG = {
  on:   { label: "On track",  dotClass: "bg-emerald-500", barClass: "bg-emerald-500", textClass: "text-emerald-500" },
  risk: { label: "At risk",   dotClass: "bg-amber-500",   barClass: "bg-amber-500",   textClass: "text-amber-500" },
  off:  { label: "Off track", dotClass: "bg-red-500",     barClass: "bg-red-500",     textClass: "text-red-500" },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/* ── Components ── */

function ProgressBar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="h-[6px] w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function SummaryStat({ label, value, dotClass }: { label: string; value: number; dotClass?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        {dotClass && <span className={`size-[7px] rounded-full ${dotClass}`} />}
        <span className="text-[20px] font-semibold tabular-nums tracking-tight">{value}</span>
      </span>
    </div>
  );
}

function GoalCard({
  kpi,
  onEdit,
  onDelete,
}: {
  kpi: Kpi;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasValue = kpi.cachedValue !== null && kpi.cachedValue !== undefined;
  const pct = hasValue ? getProgress(kpi.cachedValue!, kpi.targetValue, kpi.targetDirection) : 0;
  const status = hasValue ? getStatus(kpi.cachedValue!, kpi.targetValue, kpi.targetDirection) : "off";
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="group/card rounded-lg border border-border bg-card p-[18px] flex flex-col gap-[14px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13.5px] font-medium truncate">{kpi.name}</div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5">
            {kpi.dataSourceType === "MANUAL" ? "Manual data" : "Analytics"}
            {kpi.timePeriod !== "monthly" && ` · ${kpi.timePeriod}`}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasValue && (
            <Badge variant="secondary" className="gap-1.5 text-[11px] font-medium px-2 py-0.5">
              <span className={`size-[6px] rounded-full ${cfg.dotClass}`} />
              {cfg.label}
            </Badge>
          )}
          <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-semibold tabular-nums tracking-tight leading-none">
          {hasValue ? formatValue(kpi.cachedValue!, kpi.displayFormat) : "—"}
        </span>
        <span className="text-[12.5px] text-muted-foreground tabular-nums">
          / {formatValue(kpi.targetValue, kpi.displayFormat)} target
        </span>
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-[6px]">
        <ProgressBar pct={pct} colorClass={cfg.barClass} />
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] text-muted-foreground">
            {kpi.cachedAt ? `Updated ${timeAgo(kpi.cachedAt)}` : "No data yet"}
          </span>
          {hasValue && (
            <span className={`text-[11.5px] font-medium tabular-nums ${cfg.textClass}`}>
              {pct.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */

export default function GoalsPanel({ orgId }: GoalsPanelProps) {
  const [kpis, setKpis] = React.useState<Kpi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingKpi, setEditingKpi] = React.useState<Kpi | null>(null);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/kpis");
      if (!res.ok) throw new Error("Failed to load goals");
      const data = (await res.json()) as Kpi[];
      setKpis(Array.isArray(data) ? data : []);
    } catch {
      if (!silent) {
        setKpis([]);
        toast.error("Could not load goals.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load, orgId]);

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
      await load(true);
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
      setTimeout(() => load(true), 3000);
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
    setKpis((prev) => prev.filter((k) => k.id !== id));
    try {
      const res = await fetch(`/api/kpis/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete goal");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
      await load(true);
    }
  }

  /* ── Summary stats ── */
  const kpisWithValue = kpis.filter((k) => k.cachedValue !== null);
  const counts = { on: 0, risk: 0, off: 0 };
  let totalPct = 0;
  for (const k of kpisWithValue) {
    const pct = getProgress(k.cachedValue!, k.targetValue, k.targetDirection);
    totalPct += pct;
    const s = getStatus(k.cachedValue!, k.targetValue, k.targetDirection);
    counts[s]++;
  }
  const avgPct = kpisWithValue.length > 0 ? Math.round(totalPct / kpisWithValue.length) : 0;

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
                <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
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
              <Plus className="size-3" />
              Add goal
            </Button>
          </div>
        }
      />

      <PageBody contained="default" padding="default">
        <div className="mb-[22px]">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
            Goals
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground max-w-[580px]">
            Define KPI targets so Meaning can compare actual vs target in
            answers, charts, and email reports.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[160px] animate-pulse rounded-lg border border-border bg-muted/40"
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
          <>
            {/* Summary strip */}
            <div className="mb-[18px] flex items-center gap-10 rounded-lg border border-border bg-card px-5 py-4">
              <SummaryStat label="Tracking" value={kpis.length} />
              <div className="w-px h-8 bg-border" />
              <SummaryStat label="On track" value={counts.on} dotClass="bg-emerald-500" />
              <SummaryStat label="At risk" value={counts.risk} dotClass="bg-amber-500" />
              <SummaryStat label="Off track" value={counts.off} dotClass="bg-red-500" />
              <div className="flex-1" />
              <div className="flex flex-col gap-1 min-w-[160px]">
                <span className="text-[11px] text-muted-foreground">Avg. progress to target</span>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1">
                    <ProgressBar pct={avgPct} colorClass="bg-foreground" />
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums">{avgPct}%</span>
                </div>
              </div>
            </div>

            {/* Goal grid */}
            <div className="grid grid-cols-2 gap-[14px]">
              {kpis.map((kpi) => (
                <GoalCard
                  key={kpi.id}
                  kpi={kpi}
                  onEdit={() => {
                    setEditingKpi(kpi);
                    setDialogOpen(true);
                  }}
                  onDelete={() => deleteKpi(kpi.id)}
                />
              ))}

              {/* Add goal tile */}
              <button
                type="button"
                className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-transparent text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                onClick={() => {
                  setEditingKpi(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="size-[18px]" />
                <span className="text-[12.5px]">Add a goal</span>
              </button>
            </div>
          </>
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
