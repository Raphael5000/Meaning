"use client";

import * as React from "react";
import { I } from "../icons";
import { Btn } from "../primitives";
import {
  type Frequency,
  type DayKey,
  type UiSchedule,
  TIME_SLOTS,
  DAY_ORDER,
  dayShort,
  formatTime,
  summarizeSchedule,
} from "./schedule";

interface SchedulePillProps {
  value: UiSchedule;
  onChange: (next: UiSchedule) => void;
  /** Override the icon (used by the recipients pill which shares the chrome) */
  icon?: React.ReactNode;
  label?: string;
}

/**
 * Inline "Send" pill — clicking it expands a popover with frequency / day /
 * time chips. Selection commits immediately; no Save button (per design).
 */
export function SchedulePill({
  value,
  onChange,
  icon,
  label = "Send",
}: SchedulePillProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
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
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 12,
          background: "var(--v2-surface)",
          border: "1px solid var(--v2-line)",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "var(--v2-font-sans)",
          transition:
            "background 120ms var(--v2-ease), border-color 120ms var(--v2-ease)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--v2-surface-2)";
          e.currentTarget.style.borderColor = "var(--v2-line-strong)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--v2-surface)";
          e.currentTarget.style.borderColor = "var(--v2-line)";
        }}
      >
        <span style={{ color: "var(--v2-ink-muted)", display: "inline-flex" }}>
          {icon ?? <I.Bell size={14} />}
        </span>
        <span
          style={{
            fontSize: 11.5,
            color: "var(--v2-ink-muted)",
            minWidth: 28,
          }}
        >
          {label}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 13.5,
            color: "var(--v2-ink)",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {summarizeSchedule(value)}
        </span>
        <span
          className="mono"
          style={{ fontSize: 11, color: "var(--v2-ink-muted)" }}
        >
          GMT+2
        </span>
        <I.Edit
          size={12}
          style={{ color: "var(--v2-ink-subtle)", flexShrink: 0 }}
        />
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: "var(--v2-surface)",
            border: "1px solid var(--v2-line)",
            borderRadius: 14,
            boxShadow: "var(--v2-shadow-pop)",
            padding: 20,
            fontFamily: "var(--v2-font-sans)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Section label="Frequency">
              <ChipRow>
                {(["daily", "weekly", "biweekly", "monthly"] as Frequency[]).map(
                  (f) => (
                    <Pill
                      key={f}
                      label={f[0].toUpperCase() + f.slice(1)}
                      active={value.frequency === f}
                      onClick={() => onChange({ ...value, frequency: f })}
                    />
                  ),
                )}
              </ChipRow>
            </Section>

            {value.frequency !== "daily" && (
              <Section label="Day">
                <div style={{ display: "flex", gap: 6 }}>
                  {DAY_ORDER.map((d) => (
                    <DayTile
                      key={d}
                      label={dayShort(d)}
                      active={value.day === d}
                      onClick={() => onChange({ ...value, day: d })}
                    />
                  ))}
                </div>
              </Section>
            )}

            <Section label="Time · GMT+2">
              <ChipRow>
                {TIME_SLOTS.map((t) => (
                  <Pill
                    key={t}
                    label={formatTime(t)}
                    active={value.hour === t}
                    onClick={() => onChange({ ...value, hour: t })}
                  />
                ))}
              </ChipRow>
            </Section>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingTop: 4,
              }}
            >
              <Btn variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Done
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="kicker" style={{ marginBottom: 10 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        background: active ? "var(--v2-ink)" : "var(--v2-surface)",
        color: active ? "var(--v2-ink-inverse)" : "var(--v2-ink)",
        border: `1px solid ${active ? "var(--v2-ink)" : "var(--v2-line)"}`,
        cursor: "pointer",
        fontFamily: "var(--v2-font-sans)",
        transition:
          "background 120ms var(--v2-ease), border-color 120ms var(--v2-ease)",
      }}
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = "var(--v2-line-strong)";
        e.currentTarget.style.background = "var(--v2-surface-2)";
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = "var(--v2-line)";
        e.currentTarget.style.background = "var(--v2-surface)";
      }}
    >
      {label}
    </button>
  );
}

function DayTile({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 42,
        height: 34,
        borderRadius: 8,
        background: active ? "var(--v2-ink)" : "var(--v2-surface)",
        color: active ? "var(--v2-ink-inverse)" : "var(--v2-ink)",
        border: `1px solid ${active ? "var(--v2-ink)" : "var(--v2-line)"}`,
        fontSize: 11.5,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        fontFamily: "var(--v2-font-sans)",
        transition: "all 120ms var(--v2-ease)",
      }}
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = "var(--v2-line-strong)";
        e.currentTarget.style.background = "var(--v2-surface-2)";
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = "var(--v2-line)";
        e.currentTarget.style.background = "var(--v2-surface)";
      }}
    >
      {label}
    </button>
  );
}

/** Re-export for the recipients pill which shares chrome */
export type { UiSchedule, Frequency, DayKey };
