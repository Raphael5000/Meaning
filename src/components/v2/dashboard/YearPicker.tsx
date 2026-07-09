"use client";

import * as React from "react";
import { I } from "../icons";

interface YearPickerProps {
  /** YYYY format */
  value: string;
  onChange: (value: string) => void;
}

export function YearPicker({ value, onChange }: YearPickerProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const selectedYear = Number(value);
  const currentYear = new Date().getFullYear();

  // Show a range of years from 2020 to current year
  const years = React.useMemo(() => {
    const result: number[] = [];
    for (let y = currentYear; y >= 2020; y--) result.push(y);
    return result;
  }, [currentYear]);

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
        <span style={{ fontWeight: 500 }}>{value}</span>
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
            padding: 5,
            minWidth: 140,
          }}
        >
          {years.map((y) => {
            const isSelected = y === selectedYear;
            return (
              <button
                key={y}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(String(y));
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  width: "100%",
                  padding: "7px 10px",
                  background: isSelected ? "var(--v2-surface-2)" : "transparent",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: "var(--v2-ink)",
                  textAlign: "left",
                  fontSize: 12.5,
                  fontWeight: isSelected ? 500 : 400,
                  fontFamily: "var(--v2-font-sans)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "var(--v2-surface-2)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span>{y}</span>
                {isSelected && <I.Check size={12} style={{ color: "var(--v2-brand)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
