"use client";

import * as React from "react";
import { ChevronLeft, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Page, PageBody, PageHeader } from "../layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ──────────────── Types ──────────────── */

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
}

interface ManualDataViewProps {
  orgId: string | null;
  onBack: () => void;
}

/* ──────────────── Helpers ──────────────── */

const MONTHS = [
  { value: "01", label: "Jan" }, { value: "02", label: "Feb" },
  { value: "03", label: "Mar" }, { value: "04", label: "Apr" },
  { value: "05", label: "May" }, { value: "06", label: "Jun" },
  { value: "07", label: "Jul" }, { value: "08", label: "Aug" },
  { value: "09", label: "Sep" }, { value: "10", label: "Oct" },
  { value: "11", label: "Nov" }, { value: "12", label: "Dec" },
];

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", ZAR: "R", AUD: "A$", CAD: "C$", JPY: "¥",
  CHF: "CHF ", INR: "₹", BRL: "R$", NZD: "NZ$", SEK: "kr ", NOK: "kr ",
  MXN: "$", SGD: "S$", HKD: "HK$", KRW: "₩", TRY: "₺", ILS: "₪",
  AED: "AED ", NGN: "₦", PHP: "₱", THB: "฿", CNY: "¥",
};

function fmtValue(value: number, displayFormat: string, cc: string): string {
  switch (displayFormat) {
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "currency": {
      const sym = CURRENCY_SYMBOLS[cc] || cc + " ";
      return `${sym}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    default:
      return value.toLocaleString();
  }
}

const selectClass = "flex h-7 rounded-md border border-input bg-transparent px-2 text-[12px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function getYearOptions(): number[] {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = now - 3; y <= now + 1; y++) years.push(y);
  return years;
}

/* ──────────────── Period Picker ──────────────── */

function PeriodPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [year, month] = value.split("-");
  return (
    <div className="flex gap-1">
      <select
        value={month}
        onChange={(e) => onChange(`${year}-${e.target.value}`)}
        className={selectClass}
      >
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onChange(`${e.target.value}-${month}`)}
        className={selectClass}
      >
        {getYearOptions().map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

/* ──────────────── Component ──────────────── */

export default function ManualDataView({ orgId, onBack }: ManualDataViewProps) {
  const [metrics, setMetrics] = React.useState<ManualMetric[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currencyCode, setCurrencyCode] = React.useState("USD");

  // New metric form
  const [newName, setNewName] = React.useState("");
  const [newFormat, setNewFormat] = React.useState("number");
  const [adding, setAdding] = React.useState(false);

  // Rename
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameDraft, setRenameDraft] = React.useState("");

  // Editing entry (inline)
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [editPeriod, setEditPeriod] = React.useState("");
  const [editValue, setEditValue] = React.useState("");
  const [editNote, setEditNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

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

  React.useEffect(() => { load(); }, [load, orgId]);

  React.useEffect(() => {
    if (!orgId) return;
    fetch(`/api/organizations/${orgId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.organization?.displayCurrency) setCurrencyCode(data.organization.displayCurrency);
      })
      .catch(() => {});
  }, [orgId]);

  /* ── Metric CRUD ── */

  async function addMetric() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/manual-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), displayFormat: newFormat }),
      });
      if (!res.ok) throw new Error();
      const created = (await res.json()) as ManualMetric;
      setMetrics((prev) => [...prev, created]);
      setNewName("");
      setNewFormat("number");
    } catch {
      toast.error("Could not create metric.");
    } finally {
      setAdding(false);
    }
  }

  async function renameMetric(id: string) {
    if (!renameDraft.trim()) return;
    // Optimistic
    setMetrics((prev) => prev.map((m) => m.id === id ? { ...m, name: renameDraft.trim() } : m));
    setRenamingId(null);
    try {
      const res = await fetch(`/api/manual-metrics/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameDraft.trim() }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Could not rename metric.");
      await load();
    }
  }

  async function deleteMetric(id: string) {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
    try {
      await fetch(`/api/manual-metrics/${id}`, { method: "DELETE" });
    } catch {
      toast.error("Could not delete metric.");
      await load();
    }
  }

  /* ── Entry CRUD ── */

  function startEditEntry(metricId: string, entry?: ManualMetricEntry) {
    if (entry) {
      setEditingKey(`${metricId}:${entry.period}`);
      setEditPeriod(entry.period);
      setEditValue(String(entry.value));
      setEditNote(entry.note || "");
    } else {
      setEditingKey(`${metricId}:new`);
      setEditPeriod(getCurrentPeriod());
      setEditValue("");
      setEditNote("");
    }
  }

  function cancelEdit() {
    setEditingKey(null);
  }

  async function saveEntry(metricId: string) {
    const val = parseFloat(editValue);
    if (isNaN(val) || !editPeriod) return;
    setSaving(true);

    // Optimistic update
    const newEntry: ManualMetricEntry = {
      id: `temp-${Date.now()}`,
      period: editPeriod,
      value: val,
      note: editNote.trim() || null,
    };
    setMetrics((prev) =>
      prev.map((m) => {
        if (m.id !== metricId) return m;
        const existing = m.entries.findIndex((e) => e.period === editPeriod);
        let entries: ManualMetricEntry[];
        if (existing >= 0) {
          entries = m.entries.map((e, i) => i === existing ? { ...e, value: val, note: editNote.trim() || null } : e);
        } else {
          entries = [...m.entries, newEntry].sort((a, b) => b.period.localeCompare(a.period));
        }
        return { ...m, entries };
      })
    );
    setEditingKey(null);

    try {
      const res = await fetch(`/api/manual-metrics/${metricId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: editPeriod, value: val, note: editNote.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      // Reload to get real IDs
      await load();
    } catch {
      toast.error("Could not save entry.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(metricId: string, period: string) {
    // Optimistic
    setMetrics((prev) =>
      prev.map((m) =>
        m.id === metricId
          ? { ...m, entries: m.entries.filter((e) => e.period !== period) }
          : m
      )
    );
    try {
      await fetch(`/api/manual-metrics/${metricId}/entries?period=${encodeURIComponent(period)}`, { method: "DELETE" });
    } catch {
      toast.error("Could not delete entry.");
      await load();
    }
  }

  /* ── Render ── */

  return (
    <Page className="meaning-v2">
      <PageHeader
        breadcrumb={["Connections", "Manual Data"]}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            <ChevronLeft className="size-3.5" />
            Back
          </Button>
        }
      />

      <PageBody contained="default" padding="default">
        <header className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
            Manual Data
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Add metrics you track outside of connected platforms.
          </p>
        </header>

        {/* Add new metric */}
        <div className="mb-6 flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Metric name</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addMetric(); }}
              placeholder="e.g. Leads, Sales Calls, Revenue"
              className="h-9 text-[13px]"
            />
          </div>
          <div className="w-[130px]">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Format</label>
            <select
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="number">Number</option>
              <option value="currency">Currency</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>
          <Button size="sm" onClick={addMetric} disabled={!newName.trim() || adding} className="h-9">
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted/40" />
            ))}
          </div>
        ) : metrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-[13px] text-muted-foreground">No metrics yet. Add one above to start logging data.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {metrics.map((metric) => {
              const isNewRow = editingKey === `${metric.id}:new`;

              return (
                <div key={metric.id} className="group/card rounded-lg border border-border bg-card overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between bg-muted/30 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {renamingId === metric.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameMetric(metric.id);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            autoFocus
                            className="h-7 w-[200px] text-[13px]"
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => renameMetric(metric.id)}>
                            <Check className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setRenamingId(null)}>
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-[13px] font-semibold text-foreground">{metric.name}</span>
                          <button
                            type="button"
                            className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/card:opacity-100"
                            onClick={() => { setRenamingId(metric.id); setRenameDraft(metric.name); }}
                          >
                            <Pencil className="size-3" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => startEditEntry(metric.id)}
                      >
                        <Plus className="size-3" />
                        Add row
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteMetric(metric.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-muted-foreground w-[160px]">Month</th>
                        <th className="px-4 py-2 text-right text-[11px] font-medium text-muted-foreground w-[120px]">Value</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-muted-foreground">Note</th>
                        <th className="w-[70px] px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {metric.entries.map((entry) => {
                        const rowKey = `${metric.id}:${entry.period}`;
                        const isEditing = editingKey === rowKey;

                        if (isEditing) {
                          return (
                            <tr key={entry.id} className="border-b border-border bg-muted/20">
                              <td className="px-3 py-1.5">
                                <PeriodPicker value={editPeriod} onChange={setEditPeriod} />
                              </td>
                              <td className="px-3 py-1.5">
                                <Input
                                  type="number"
                                  step="any"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveEntry(metric.id); if (e.key === "Escape") cancelEdit(); }}
                                  className="h-7 text-[12px] text-right"
                                  autoFocus
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <Input
                                  value={editNote}
                                  onChange={(e) => setEditNote(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveEntry(metric.id); if (e.key === "Escape") cancelEdit(); }}
                                  placeholder="optional"
                                  className="h-7 text-[12px]"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-0.5">
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => saveEntry(metric.id)} disabled={saving}>
                                    <Check className="size-3.5 text-emerald-600" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelEdit}>
                                    <X className="size-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={entry.id}
                            className="group/row border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/20"
                            onClick={() => startEditEntry(metric.id, entry)}
                          >
                            <td className="px-4 py-2 text-foreground">{formatPeriodLabel(entry.period)}</td>
                            <td className="px-4 py-2 text-right font-medium tabular-nums text-foreground">
                              {fmtValue(entry.value, metric.displayFormat, currencyCode)}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">{entry.note || "—"}</td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/row:opacity-100"
                                onClick={(e) => { e.stopPropagation(); deleteEntry(metric.id, entry.period); }}
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* New row */}
                      {isNewRow ? (
                        <tr className="bg-muted/20">
                          <td className="px-3 py-1.5">
                            <PeriodPicker value={editPeriod} onChange={setEditPeriod} />
                          </td>
                          <td className="px-3 py-1.5">
                            <Input
                              type="number"
                              step="any"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEntry(metric.id); if (e.key === "Escape") cancelEdit(); }}
                              placeholder="0"
                              className="h-7 text-[12px] text-right"
                              autoFocus
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <Input
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEntry(metric.id); if (e.key === "Escape") cancelEdit(); }}
                              placeholder="optional"
                              className="h-7 text-[12px]"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-0.5">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => saveEntry(metric.id)} disabled={saving || !editValue}>
                                <Check className="size-3.5 text-emerald-600" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelEdit}>
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : metric.entries.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-[12px] text-muted-foreground">
                            No entries yet.{" "}
                            <button type="button" className="text-foreground underline underline-offset-2" onClick={() => startEditEntry(metric.id)}>
                              Add the first row
                            </button>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </PageBody>
    </Page>
  );
}
