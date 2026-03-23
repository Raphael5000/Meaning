"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

interface DateRangePickerProps {
  dateRange: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  onChange: (dateRange: string, dateFrom?: string | null, dateTo?: string | null) => void;
}

const PRESETS = [
  { value: "7d", label: "7 days" },
  { value: "28d", label: "28 days" },
  { value: "90d", label: "90 days" },
  { value: "custom", label: "Custom" },
];

export default function DateRangePicker({ dateRange, dateFrom, dateTo, onChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(dateRange === "custom");
  const [localFrom, setLocalFrom] = useState(dateFrom || "");
  const [localTo, setLocalTo] = useState(dateTo || "");

  function handlePreset(value: string) {
    if (value === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    onChange(value, null, null);
  }

  function handleCustomApply() {
    if (localFrom && localTo) {
      onChange("custom", localFrom, localTo);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex items-center gap-1 rounded-lg border px-1 py-0.5" style={{ borderColor: "var(--border-color)" }}>
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => handlePreset(p.value)}
            className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
            style={{
              background: (dateRange === p.value || (p.value === "custom" && showCustom)) ? "var(--accent)" : "transparent",
              color: (dateRange === p.value || (p.value === "custom" && showCustom)) ? "white" : "var(--text-secondary)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
            className="h-7 rounded border bg-transparent px-1.5 text-[11px] text-foreground"
            style={{ borderColor: "var(--border-color)" }}
          />
          <span className="text-[11px] text-muted-foreground">to</span>
          <input
            type="date"
            value={localTo}
            onChange={(e) => setLocalTo(e.target.value)}
            className="h-7 rounded border bg-transparent px-1.5 text-[11px] text-foreground"
            style={{ borderColor: "var(--border-color)" }}
          />
          <button
            type="button"
            onClick={handleCustomApply}
            disabled={!localFrom || !localTo}
            className="rounded-md px-2 py-1 text-[11px] font-medium disabled:opacity-40"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
