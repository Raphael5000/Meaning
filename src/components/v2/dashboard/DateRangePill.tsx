"use client";

import * as React from "react";
import { format, subDays, startOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { I } from "../icons";
import { V2Calendar } from "./V2Calendar";

export interface DateRangeValue {
  dateRange: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}

interface DateRangePillProps {
  dateRange: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  onChange: (v: DateRangeValue) => void;
}

const PRESETS: { value: string; label: string; days: number }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "28d", label: "Last 28 days", days: 28 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "today", label: "Today", days: 0 },
  { value: "yesterday", label: "Yesterday", days: 1 },
];

function activeLabel(
  dateRange: string,
  from: string | null | undefined,
  to: string | null | undefined,
): string {
  if (dateRange === "custom" && from && to) {
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${fmt(from)} – ${fmt(to)}`;
  }
  return PRESETS.find((p) => p.value === dateRange)?.label ?? "Last 7 days";
}

type PickerMode = "presets" | "custom";

export function DateRangePill({
  dateRange,
  dateFrom,
  dateTo,
  onChange,
}: DateRangePillProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<PickerMode>("presets");
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const initialCustomRange: DateRange | undefined = React.useMemo(() => {
    if (dateRange === "custom" && dateFrom && dateTo) {
      return { from: new Date(dateFrom), to: new Date(dateTo) };
    }
    return {
      from: startOfDay(subDays(new Date(), 28)),
      to: startOfDay(new Date()),
    };
  }, [dateRange, dateFrom, dateTo]);

  const [pendingCustom, setPendingCustom] = React.useState<DateRange | undefined>(
    initialCustomRange,
  );

  React.useEffect(() => {
    if (!open) return;
    setMode(dateRange === "custom" ? "custom" : "presets");
    setPendingCustom(initialCustomRange);
  }, [open, dateRange, initialCustomRange]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (triggerRef.current?.contains(t as Node)) return;
      if (menuRef.current?.contains(t as Node)) return;
      // react-day-picker renders some internal UI inside its own roots
      // which ARE descendants of menuRef — if that check passed we've returned
      // already. Otherwise close.
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function applyCustom() {
    if (pendingCustom?.from && pendingCustom?.to) {
      onChange({
        dateRange: "custom",
        dateFrom: format(pendingCustom.from, "yyyy-MM-dd"),
        dateTo: format(pendingCustom.to, "yyyy-MM-dd"),
      });
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px 6px 12px",
          background: "var(--v2-surface-2)",
          border: "1px solid var(--v2-line)",
          borderRadius: 8,
          cursor: "pointer",
          color: "var(--v2-ink)",
          fontSize: 12,
          fontFamily: "var(--v2-font-sans)",
        }}
      >
        <span style={{ fontWeight: 500 }}>
          {activeLabel(dateRange, dateFrom, dateTo)}
        </span>
        <I.Chevron
          size={12}
          style={{
            color: "var(--v2-ink-muted)",
            marginLeft: 2,
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 120ms var(--v2-ease)",
          }}
        />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 40,
            background: "var(--v2-surface)",
            border: "1px solid var(--v2-line)",
            borderRadius: 10,
            boxShadow: "var(--v2-shadow-pop)",
            fontSize: 12.5,
            overflow: "hidden",
          }}
        >
          {mode === "presets" ? (
            <div style={{ padding: 5, minWidth: 200 }}>
              {PRESETS.map((p) => {
                const active = dateRange === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onChange({
                        dateRange: p.value,
                        dateFrom: null,
                        dateTo: null,
                      });
                      setOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      width: "100%",
                      padding: "7px 10px",
                      background: active ? "var(--v2-surface-2)" : "transparent",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      color: "var(--v2-ink)",
                      textAlign: "left",
                      fontSize: 12.5,
                      fontWeight: active ? 500 : 400,
                      fontFamily: "var(--v2-font-sans)",
                    }}
                    onMouseEnter={(e) => {
                      if (!active)
                        e.currentTarget.style.background =
                          "var(--v2-surface-2)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span>{p.label}</span>
                    {active && (
                      <I.Check
                        size={12}
                        style={{ color: "var(--v2-brand)" }}
                      />
                    )}
                  </button>
                );
              })}
              <div
                style={{
                  height: 1,
                  background: "var(--v2-line)",
                  margin: "4px 2px",
                }}
              />
              <button
                type="button"
                role="menuitem"
                onClick={() => setMode("custom")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  width: "100%",
                  padding: "7px 10px",
                  background:
                    dateRange === "custom" ? "var(--v2-surface-2)" : "transparent",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: "var(--v2-ink)",
                  textAlign: "left",
                  fontSize: 12.5,
                  fontWeight: dateRange === "custom" ? 500 : 400,
                  fontFamily: "var(--v2-font-sans)",
                }}
                onMouseEnter={(e) => {
                  if (dateRange !== "custom")
                    e.currentTarget.style.background = "var(--v2-surface-2)";
                }}
                onMouseLeave={(e) => {
                  if (dateRange !== "custom")
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <span>Custom range…</span>
                <I.ChevronR
                  size={11}
                  style={{ color: "var(--v2-ink-muted)" }}
                />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px 6px",
                  borderBottom: "1px solid var(--v2-line)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setMode("presets")}
                  aria-label="Back to presets"
                  style={{
                    width: 22,
                    height: 22,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--v2-ink-muted)",
                    borderRadius: 5,
                  }}
                >
                  <I.ChevronL size={13} />
                </button>
                <span
                  className="kicker"
                  style={{ letterSpacing: "0.06em" }}
                >
                  Custom range
                </span>
              </div>
              <V2Calendar
                mode="range"
                selected={pendingCustom}
                onSelect={setPendingCustom}
                numberOfMonths={2}
                defaultMonth={pendingCustom?.from}
                disabled={{ after: new Date() }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 12px",
                  borderTop: "1px solid var(--v2-line)",
                  background: "var(--v2-surface-2)",
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    color: "var(--v2-ink-muted)",
                    fontFamily: "var(--v2-font-sans)",
                  }}
                  className="num"
                >
                  {pendingCustom?.from && pendingCustom?.to
                    ? `${format(pendingCustom.from, "MMM d, yyyy")} – ${format(
                        pendingCustom.to,
                        "MMM d, yyyy",
                      )}`
                    : "Select start and end dates"}
                </span>
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!pendingCustom?.from || !pendingCustom?.to}
                  style={{
                    padding: "5px 11px",
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: "var(--v2-font-sans)",
                    background: "var(--v2-brand-bg)",
                    color: "var(--v2-brand)",
                    border: "1px solid transparent",
                    borderRadius: 6,
                    cursor:
                      pendingCustom?.from && pendingCustom?.to
                        ? "pointer"
                        : "not-allowed",
                    opacity:
                      pendingCustom?.from && pendingCustom?.to ? 1 : 0.55,
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
