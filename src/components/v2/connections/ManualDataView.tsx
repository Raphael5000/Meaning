"use client";

import * as React from "react";
import { ChevronLeft, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Page, PageBody, PageHeader } from "../layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function formatValue(value: number, displayFormat: string, currencyCode: string): string {
  switch (displayFormat) {
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "currency": {
      const sym = CURRENCY_SYMBOLS[currencyCode] || currencyCode + " ";
      return `${sym}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    default:
      return value.toLocaleString();
  }
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
  const [savingRename, setSavingRename] = React.useState(false);

  // Entry form
  const [entryMetricId, setEntryMetricId] = React.useState<string | null>(null);
  const [entryPeriod, setEntryPeriod] = React.useState(getCurrentPeriod());
  const [entryValue, setEntryValue] = React.useState("");
  const [entryNote, setEntryNote] = React.useState("");
  const [savingEntry, setSavingEntry] = React.useState(false);

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

  // Fetch org currency
  React.useEffect(() => {
    if (!orgId) return;
    fetch(`/api/organizations/${orgId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.organization?.displayCurrency) setCurrencyCode(data.organization.displayCurrency);
      })
      .catch(() => {});
  }, [orgId]);

  async function renameMetric(id: string) {
    if (!renameDraft.trim()) return;
    setSavingRename(true);
    try {
      const res = await fetch(`/api/manual-metrics/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameDraft.trim() }),
      });
      if (!res.ok) throw new Error();
      setRenamingId(null);
      await load();
    } catch {
      toast.error("Could not rename metric.");
    } finally {
      setSavingRename(false);
    }
  }

  async function addMetric() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/manual-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), displayFormat: newFormat }),
      });
      if (!res.ok) throw new Error("Failed to create");
      setNewName("");
      setNewFormat("number");
      await load();
      toast.success("Metric added.");
    } catch {
      toast.error("Could not create metric.");
    } finally {
      setAdding(false);
    }
  }

  async function deleteMetric(id: string) {
    try {
      const res = await fetch(`/api/manual-metrics/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMetrics((prev) => prev.filter((m) => m.id !== id));
      toast.success("Metric deleted.");
    } catch {
      toast.error("Could not delete metric.");
    }
  }

  async function saveEntry() {
    if (!entryMetricId || !entryValue) return;
    const val = parseFloat(entryValue);
    if (isNaN(val)) return;
    setSavingEntry(true);
    try {
      const res = await fetch(`/api/manual-metrics/${entryMetricId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: entryPeriod,
          value: val,
          note: entryNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setEntryMetricId(null);
      setEntryValue("");
      setEntryNote("");
      await load();
      toast.success("Entry saved.");
    } catch {
      toast.error("Could not save entry.");
    } finally {
      setSavingEntry(false);
    }
  }

  async function deleteEntry(metricId: string, period: string) {
    try {
      await fetch(
        `/api/manual-metrics/${metricId}/entries?period=${encodeURIComponent(period)}`,
        { method: "DELETE" },
      );
      await load();
    } catch {
      toast.error("Could not delete entry.");
    }
  }

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
            Add metrics you track outside of connected platforms — leads, sales calls, revenue, or anything else.
          </p>
        </header>

        {/* Add new metric */}
        <div className="mb-6 flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Metric name
            </label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addMetric(); }}
              placeholder="e.g. Leads, Sales Calls, Revenue"
              className="h-9 text-[13px]"
            />
          </div>
          <div className="w-[130px]">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Format
            </label>
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
          <Button
            size="sm"
            onClick={addMetric}
            disabled={!newName.trim() || adding}
            className="h-9"
          >
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
            <p className="text-[13px] text-muted-foreground">
              No metrics yet. Add one above to start logging data.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {metrics.map((metric) => (
              <div key={metric.id} className="group/card rounded-lg border border-border bg-card">
                {/* Metric header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
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
                          disabled={savingRename}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => renameMetric(metric.id)}
                          disabled={savingRename}
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setRenamingId(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-[13px] font-medium text-foreground">
                          {metric.name}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover/card:opacity-100"
                          onClick={() => {
                            setRenamingId(metric.id);
                            setRenameDraft(metric.name);
                          }}
                        >
                          <Pencil className="size-3 text-muted-foreground" />
                        </Button>
                      </>
                    )}
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                      {metric.displayFormat}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => {
                        setEntryMetricId(
                          entryMetricId === metric.id ? null : metric.id,
                        );
                        setEntryValue("");
                        setEntryNote("");
                        setEntryPeriod(getCurrentPeriod());
                      }}
                    >
                      <Plus className="size-3" />
                      Log value
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

                {/* Inline entry form */}
                {entryMetricId === metric.id && (
                  <div className="flex items-end gap-2 border-b border-border bg-muted/30 px-4 py-3">
                    <div className="w-[120px]">
                      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                        Month
                      </label>
                      <Input
                        type="month"
                        value={entryPeriod}
                        onChange={(e) => setEntryPeriod(e.target.value)}
                        className="h-8 text-[12px]"
                      />
                    </div>
                    <div className="w-[100px]">
                      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                        Value
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={entryValue}
                        onChange={(e) => setEntryValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEntry(); }}
                        placeholder="0"
                        className="h-8 text-[12px]"
                        autoFocus
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                        Note (optional)
                      </label>
                      <Input
                        value={entryNote}
                        onChange={(e) => setEntryNote(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEntry(); }}
                        placeholder="e.g. Includes trade show"
                        className="h-8 text-[12px]"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={saveEntry}
                      disabled={!entryValue || savingEntry}
                      className="h-8"
                    >
                      Save
                    </Button>
                  </div>
                )}

                {/* Entries table */}
                {metric.entries.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">Month</TableHead>
                        <TableHead className="text-right text-[11px]">Value</TableHead>
                        <TableHead className="text-[11px]">Note</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metric.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-[12px]">
                            {formatPeriodLabel(entry.period)}
                          </TableCell>
                          <TableCell className="text-right text-[12px] font-medium tabular-nums">
                            {formatValue(entry.value, metric.displayFormat, currencyCode)}
                          </TableCell>
                          <TableCell className="text-[12px] text-muted-foreground">
                            {entry.note || "—"}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                              onClick={() => deleteEntry(metric.id, entry.period)}
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
                    No entries yet. Click &quot;Log value&quot; to add data.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </Page>
  );
}
