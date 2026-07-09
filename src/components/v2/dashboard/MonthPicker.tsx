"use client";

import * as React from "react";
import { I } from "../icons";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface MonthPickerProps {
  /** YYYY-MM format */
  value: string;
  onChange: (value: string) => void;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const [selectedYear, selectedMonth] = React.useMemo(() => {
    const [y, m] = value.split("-");
    return [Number(y), Number(m) - 1]; // 0-indexed month
  }, [value]);

  const [viewYear, setViewYear] = React.useState(selectedYear);

  React.useEffect(() => {
    if (open) setViewYear(selectedYear);
  }, [open, selectedYear]);

  // Close on outside click / escape
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
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

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  function isFuture(year: number, month: number) {
    return year > currentYear || (year === currentYear && month > currentMonth);
  }

  const displayLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;

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
        <I.Calendar size={13} style={{ color: "var(--v2-ink-muted)" }} />
        <span style={{ fontWeight: 500 }}>{displayLabel}</span>
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
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 40,
            background: "var(--v2-surface)",
            border: "1px solid var(--v2-line)",
            borderRadius: 10,
            boxShadow: "var(--v2-shadow-pop)",
            padding: 8,
            width: 240,
          }}
        >
          {/* Year nav */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              padding: "0 4px",
            }}
          >
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              disabled={viewYear <= 2020}
              style={{
                width: 24,
                height: 24,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                cursor: viewYear <= 2020 ? "not-allowed" : "pointer",
                color: "var(--v2-ink-muted)",
                borderRadius: 5,
                opacity: viewYear <= 2020 ? 0.3 : 1,
              }}
              aria-label="Previous year"
            >
              <I.ChevronL size={13} />
            </button>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--v2-ink)",
                fontFamily: "var(--v2-font-sans)",
              }}
            >
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              disabled={viewYear >= currentYear}
              style={{
                width: 24,
                height: 24,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                cursor: viewYear >= currentYear ? "not-allowed" : "pointer",
                color: "var(--v2-ink-muted)",
                borderRadius: 5,
                opacity: viewYear >= currentYear ? 0.3 : 1,
              }}
              aria-label="Next year"
            >
              <I.ChevronR size={13} />
            </button>
          </div>

          {/* 4x3 month grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 4,
            }}
          >
            {MONTHS.map((label, idx) => {
              const isSelected = viewYear === selectedYear && idx === selectedMonth;
              const disabled = isFuture(viewYear, idx);
              return (
                <button
                  key={label}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={disabled}
                  onClick={() => {
                    const mm = String(idx + 1).padStart(2, "0");
                    onChange(`${viewYear}-${mm}`);
                    setOpen(false);
                  }}
                  style={{
                    padding: "7px 0",
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 400,
                    fontFamily: "var(--v2-font-sans)",
                    color: disabled
                      ? "var(--v2-ink-muted)"
                      : isSelected
                        ? "var(--v2-brand)"
                        : "var(--v2-ink)",
                    background: isSelected ? "var(--v2-brand-bg)" : "transparent",
                    border: "none",
                    borderRadius: 6,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.4 : 1,
                    transition: "background 80ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !disabled)
                      e.currentTarget.style.background = "var(--v2-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !disabled)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
