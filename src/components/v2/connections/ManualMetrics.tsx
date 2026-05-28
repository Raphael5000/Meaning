"use client";

import * as React from "react";
import { Plus, Trash2, Pencil, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ──────────────────────────── Types ──────────────────────────── */

interface ManualMetricEntry {
  id: string;
  period: string;
  value: number;
  note: string | null;
}

interface ManualMetric {
  id: string;
  name: string;
  displayFormat: string;
  entries: ManualMetricEntry[];
  kpis: { id: string; name: string }[];
}

/* ──────────────────────────── Helpers ──────────────────────────── */

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", ZAR: "R", AUD: "A$", CAD: "C$", JPY: "¥",
  CHF: "CHF ", INR: "₹", BRL: "R$", NZD: "NZ$", SEK: "kr ", NOK: "kr ",
  MXN: "$", SGD: "S$", HKD: "HK$", KRW: "₩", TRY: "₺", ILS: "₪",
  AED: "AED ", NGN: "₦", PHP: "₱", THB: "฿", CNY: "¥",
};

function formatVal(value: number, displayFormat: string, currencyCode = "USD"): string {
  switch (displayFormat) {
    case "percentage":
      return `${(value * 100).toFixed(1)}%`;
    case "currency": {
      const sym = CURRENCY_SYMBOLS[currencyCode] || currencyCode + " ";
      return `${sym}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    default:
      return value.toLocaleString();
  }
}

/* ──────────────────────────── Main Component ──────────────────────────── */

interface ManualMetricsProps {
  orgId: string | null;
  currencyCode?: string;
}

export default function ManualMetrics({ orgId, currencyCode = "USD" }: ManualMetricsProps) {
  const [metrics, setMetrics] = React.useState<ManualMetric[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeMetric, setActiveMetric] = React.useState<ManualMetric | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/manual-metrics");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ManualMetric[];
      setMetrics(Array.isArray(data) ? data : []);
    } catch {
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load, orgId]);

  // Keep active metric in sync after reloads
  React.useEffect(() => {
    if (activeMetric) {
      const updated = metrics.find((m) => m.id === activeMetric.id);
      if (updated) setActiveMetric(updated);
    }
  }, [metrics, activeMetric]);

  async function createMetric(name: string, displayFormat: string) {
    const res = await fetch("/api/manual-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, displayFormat }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || "Failed to create metric");
    }
    await load();
    setCreateOpen(false);
    toast.success("Metric created.");
  }

  async function deleteMetric(id: string) {
    const res = await fetch(`/api/manual-metrics/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    setMetrics((prev) => prev.filter((m) => m.id !== id));
    if (activeMetric?.id === id) setActiveMetric(null);
    toast.success("Metric deleted.");
  }

  async function saveEntry(metricId: string, period: string, value: number, note?: string) {
    const res = await fetch(`/api/manual-metrics/${metricId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, value, note }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || "Failed to save");
    }
    await load();
    toast.success("Entry saved.");
  }

  async function deleteEntry(metricId: string, period: string) {
    const res = await fetch(
      `/api/manual-metrics/${metricId}/entries?period=${encodeURIComponent(period)}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to delete");
    await load();
    toast.success("Entry deleted.");
  }

  if (activeMetric) {
    return (
      <MetricDetail
        metric={activeMetric}
        currencyCode={currencyCode}
        onBack={() => setActiveMetric(null)}
        onSaveEntry={(period, value, note) => saveEntry(activeMetric.id, period, value, note)}
        onDeleteEntry={(period) => deleteEntry(activeMetric.id, period)}
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Manual data
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Log your own metrics — leads, sales calls, or anything not connected to a platform.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          Add metric
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-[56px] animate-pulse rounded-lg border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : metrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
          <p className="text-[12px] text-muted-foreground">
            No manual metrics yet.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" />
            Add metric
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {metrics.map((metric) => {
            const latest = metric.entries[0];
            return (
              <div
                key={metric.id}
                className="group flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
                onClick={() => setActiveMetric(metric)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">
                      {metric.name}
                    </span>
                    {metric.kpis.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">
                        Goal linked
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    {latest
                      ? `${formatPeriodLabel(latest.period)}: ${formatVal(latest.value, metric.displayFormat, currencyCode)}`
                      : "No entries yet"}
                    {metric.entries.length > 1 && ` · ${metric.entries.length} entries`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMetric(metric.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateMetricDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createMetric}
      />
    </div>
  );
}

/* ──────────────────────────── Detail View ──────────────────────────── */

interface MetricDetailProps {
  metric: ManualMetric;
  currencyCode: string;
  onBack: () => void;
  onSaveEntry: (period: string, value: number, note?: string) => Promise<void>;
  onDeleteEntry: (period: string) => Promise<void>;
}

function MetricDetail({ metric, currencyCode, onBack, onSaveEntry, onDeleteEntry }: MetricDetailProps) {
  const [period, setPeriod] = React.useState(getCurrentPeriod());
  const [value, setValue] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(value);
    if (isNaN(val)) return;
    setSaving(true);
    try {
      await onSaveEntry(period, val, note.trim() || undefined);
      setValue("");
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="mb-4 flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={onBack}
      >
        <ChevronLeft className="size-3.5" />
        Back to manual data
      </button>

      <h3 className="text-[16px] font-semibold text-foreground">{metric.name}</h3>
      {metric.kpis.length > 0 && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Linked to goal{metric.kpis.length > 1 ? "s" : ""}: {metric.kpis.map((k) => k.name).join(", ")}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mm-period">Month</Label>
            <Input
              id="mm-period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mm-value">Value</Label>
            <Input
              id="mm-value"
              type="number"
              step="any"
              placeholder="e.g. 150"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mm-note">Note (optional)</Label>
          <Input
            id="mm-note"
            placeholder="e.g. Includes trade show leads"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={!value || isNaN(parseFloat(value)) || saving}
          className="w-full"
        >
          {saving ? "Saving..." : "Log entry"}
        </Button>
      </form>

      {metric.entries.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[12px] font-medium text-muted-foreground">
            History
          </p>
          <div className="max-h-[280px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Month</th>
                  <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Value</th>
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Note</th>
                  <th className="w-8 px-1 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {metric.entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 text-foreground">
                      {formatPeriodLabel(entry.period)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium text-foreground">
                      {formatVal(entry.value, metric.displayFormat, currencyCode)}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {entry.note || "—"}
                    </td>
                    <td className="px-1 py-1.5">
                      <button
                        type="button"
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                        onClick={() => onDeleteEntry(entry.period)}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────── Create Dialog ──────────────────────────── */

interface CreateMetricDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, displayFormat: string) => Promise<void>;
}

function CreateMetricDialog({ open, onOpenChange, onCreate }: CreateMetricDialogProps) {
  const [name, setName] = React.useState("");
  const [displayFormat, setDisplayFormat] = React.useState("number");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setDisplayFormat("number");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name.trim(), displayFormat);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New manual metric</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mm-name">Name</Label>
              <Input
                id="mm-name"
                placeholder="e.g. Leads, Sales Calls, Revenue"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
                {(["number", "currency", "percentage"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium capitalize transition-colors ${
                      displayFormat === fmt
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setDisplayFormat(fmt)}
                  >
                    {fmt === "currency" ? "Currency" : fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving ? "Creating..." : "Create metric"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
