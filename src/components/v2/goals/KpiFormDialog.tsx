"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface KpiFormData {
  name: string;
  metricDescription: string;
  targetValue: number;
  manualMetricId?: string;
}

export interface KpiEditData {
  name: string;
  targetValue: number;
}

interface ManualMetricOption {
  id: string;
  name: string;
}

interface KpiFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  editData?: {
    id: string;
    name: string;
    targetValue: number;
    manualMetricId?: string | null;
  } | null;
  onSave: (data: KpiFormData) => Promise<void>;
  onUpdate?: (id: string, data: KpiEditData) => Promise<void>;
}

export function KpiFormDialog({
  open,
  onOpenChange,
  saving,
  editData,
  onSave,
  onUpdate,
}: KpiFormDialogProps) {
  const isEdit = !!editData;

  const [name, setName] = React.useState("");
  const [metricDescription, setMetricDescription] = React.useState("");
  const [targetValue, setTargetValue] = React.useState("");
  const [mode, setMode] = React.useState<"auto" | "manual">("auto");
  const [manualMetrics, setManualMetrics] = React.useState<ManualMetricOption[]>([]);
  const [selectedMetricId, setSelectedMetricId] = React.useState("");
  const [loadingMetrics, setLoadingMetrics] = React.useState(false);

  React.useEffect(() => {
    if (open && editData) {
      setName(editData.name);
      setMetricDescription("");
      setTargetValue(String(editData.targetValue));
      setMode(editData.manualMetricId ? "manual" : "auto");
      setSelectedMetricId(editData.manualMetricId || "");
    } else if (open) {
      setName("");
      setMetricDescription("");
      setTargetValue("");
      setMode("auto");
      setSelectedMetricId("");
    }
  }, [open, editData]);

  // Load manual metrics when switching to manual mode
  React.useEffect(() => {
    if (open && mode === "manual" && manualMetrics.length === 0 && !loadingMetrics) {
      setLoadingMetrics(true);
      fetch("/api/manual-metrics")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setManualMetrics(data.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingMetrics(false));
    }
  }, [open, mode, manualMetrics.length, loadingMetrics]);

  // Reset metrics list when dialog closes
  React.useEffect(() => {
    if (!open) setManualMetrics([]);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(targetValue);
    if (isNaN(val)) return;

    if (isEdit && editData && onUpdate) {
      await onUpdate(editData.id, {
        name: name.trim(),
        targetValue: val,
      });
    } else {
      await onSave({
        name: name.trim(),
        metricDescription: metricDescription.trim(),
        targetValue: val,
        manualMetricId: mode === "manual" ? selectedMetricId : undefined,
      });
    }
  }

  const canSubmit = isEdit
    ? name.trim() && targetValue && !isNaN(parseFloat(targetValue))
    : mode === "manual"
      ? name.trim() && selectedMetricId && targetValue && !isNaN(parseFloat(targetValue))
      : name.trim() && metricDescription.trim() && targetValue && !isNaN(parseFloat(targetValue));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Goal" : "New Goal"}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {!isEdit && (
              <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    mode === "auto"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setMode("auto")}
                >
                  Auto (from data)
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    mode === "manual"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setMode("manual")}
                >
                  Manual metric
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="kpi-name">Name</Label>
              <Input
                id="kpi-name"
                placeholder={mode === "manual" ? "e.g. Monthly Lead Target" : "e.g. Monthly Website Visits"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {!isEdit && mode === "auto" && (
              <div className="space-y-1.5">
                <Label htmlFor="kpi-desc">Description</Label>
                <Input
                  id="kpi-desc"
                  placeholder="e.g. Total number of sessions this month"
                  value={metricDescription}
                  onChange={(e) => setMetricDescription(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Describe what this KPI measures. AI will figure out the rest.
                </p>
              </div>
            )}

            {!isEdit && mode === "manual" && (
              <div className="space-y-1.5">
                <Label>Link to manual metric</Label>
                {loadingMetrics ? (
                  <p className="text-[11px] text-muted-foreground">Loading metrics...</p>
                ) : manualMetrics.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    No manual metrics yet. Create one in Connections → Manual data first.
                  </p>
                ) : (
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[13px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={selectedMetricId}
                    onChange={(e) => setSelectedMetricId(e.target.value)}
                  >
                    <option value="">Select a metric...</option>
                    {manualMetrics.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="kpi-target">Target</Label>
              <Input
                id="kpi-target"
                type="number"
                step="any"
                placeholder="e.g. 10000"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || saving}>
              {saving ? "Saving..." : isEdit ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
