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
}

export interface KpiEditData {
  name: string;
  targetValue: number;
}

interface KpiFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  editData?: {
    id: string;
    name: string;
    targetValue: number;
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

  React.useEffect(() => {
    if (open && editData) {
      setName(editData.name);
      setMetricDescription("");
      setTargetValue(String(editData.targetValue));
    } else if (open) {
      setName("");
      setMetricDescription("");
      setTargetValue("");
    }
  }, [open, editData]);

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
      });
    }
  }

  const canSubmit = isEdit
    ? name.trim() && targetValue && !isNaN(parseFloat(targetValue))
    : name.trim() && metricDescription.trim() && targetValue && !isNaN(parseFloat(targetValue));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Goal" : "New Goal"}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="kpi-name">Name</Label>
              <Input
                id="kpi-name"
                placeholder="e.g. Monthly Website Visits"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {!isEdit && (
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
