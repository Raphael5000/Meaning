"use client";

import * as React from "react";
import { I } from "../icons";
import { Btn, IconBtn } from "../primitives";

export type ChartTypeId =
  | "auto"
  | "scorecard"
  | "line"
  | "bar"
  | "pie"
  | "table"
  | "sankey";

interface ChartTypeDef {
  id: ChartTypeId;
  label: string;
  hint: string;
  glyph: React.ReactNode;
}

const CHART_TYPES: ChartTypeDef[] = [
  {
    id: "auto",
    label: "Auto",
    hint: "Let Meaning decide",
    glyph: (
      <svg width="28" height="18" viewBox="0 0 28 18">
        <path d="M2 15 L8 9 L13 12 L19 5 L26 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="19" cy="5" r="1.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "scorecard",
    label: "Scorecard",
    hint: "Single number + delta",
    glyph: (
      <svg width="28" height="18" viewBox="0 0 28 18">
        <text x="3" y="14" fontSize="12" fontWeight="700" fontFamily="system-ui" fill="currentColor">
          124K
        </text>
      </svg>
    ),
  },
  {
    id: "line",
    label: "Line",
    hint: "Time series",
    glyph: (
      <svg width="28" height="18" viewBox="0 0 28 18">
        <path d="M2 14 L7 9 L11 11 L16 5 L21 8 L26 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "bar",
    label: "Bar",
    hint: "Compare categories",
    glyph: (
      <svg width="28" height="18" viewBox="0 0 28 18">
        <rect x="3" y="8" width="3" height="8" fill="currentColor" />
        <rect x="9" y="5" width="3" height="11" fill="currentColor" />
        <rect x="15" y="11" width="3" height="5" fill="currentColor" />
        <rect x="21" y="3" width="3" height="13" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "pie",
    label: "Pie",
    hint: "Share of total",
    glyph: (
      <svg width="28" height="18" viewBox="0 0 28 18">
        <circle cx="14" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M14 2 A7 7 0 0 1 20.5 12 L14 9 Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "table",
    label: "Table",
    hint: "Ranked rows",
    glyph: (
      <svg width="28" height="18" viewBox="0 0 28 18">
        <rect x="3" y="3" width="22" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M3 8 H25 M3 11.5 H25 M11 3 V15 M19 3 V15" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: "sankey",
    label: "Sankey",
    hint: "Flows & journeys",
    glyph: (
      <svg width="28" height="18" viewBox="0 0 28 18">
        <path d="M3 4 C14 4 14 6 25 6 L25 10 C14 10 14 14 3 14 Z" fill="currentColor" opacity="0.4" />
        <path d="M3 4 L3 14 M25 6 L25 10" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

interface AddWidgetDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (args: { prompt: string; chartType: ChartTypeId }) => void;
  initialPrompt?: string;
  defaultChart?: ChartTypeId;
  examples?: string[];
  busy?: boolean;
  error?: string | null;
  sourceCount?: number;
  title?: string;
  submitLabel?: string;
}

const DEFAULT_EXAMPLES = [
  "Sessions this week by channel",
  "Top 10 landing pages by conversion rate",
  "Bounce rate trend, last 30 days",
  "New users vs. returning, last 14 days",
];

export function AddWidgetDialog({
  open,
  onClose,
  onSubmit,
  initialPrompt = "",
  defaultChart = "auto",
  examples = DEFAULT_EXAMPLES,
  busy = false,
  error = null,
  sourceCount,
  title = "Describe a new widget",
  submitLabel = "Generate widget",
}: AddWidgetDialogProps) {
  const [prompt, setPrompt] = React.useState(initialPrompt);
  const [selected, setSelected] = React.useState<ChartTypeId>(defaultChart);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setPrompt(initialPrompt);
      setSelected(defaultChart);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open, initialPrompt, defaultChart]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && prompt.trim() && !busy) {
        onSubmit({ prompt: prompt.trim(), chartType: selected });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, prompt, selected, busy, onSubmit, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        background: "color-mix(in oklab, var(--v2-bg) 72%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        paddingTop: "10vh",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 680,
          maxWidth: "92%",
          background: "var(--v2-surface)",
          border: "1px solid var(--v2-line-strong)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "var(--v2-shadow-pop)",
          fontFamily: "var(--v2-font-sans)",
        }}
      >
        <div
          style={{
            padding: "18px 20px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--v2-brand-bg)",
              color: "var(--v2-brand)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <I.Sparkle size={14} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--v2-ink)",
              }}
            >
              {title}
            </div>
          </div>
          <IconBtn
            onClick={onClose}
            aria-label="Close"
            icon={<I.X size={14} />}
          />
        </div>

        <div style={{ borderTop: "1px solid var(--v2-line)" }} />

        {/* Prompt */}
        <div style={{ padding: "14px 16px 4px" }}>
          <div
            style={{
              position: "relative",
              border: "1.5px solid var(--v2-ink)",
              borderRadius: 10,
              background: "var(--v2-surface)",
              padding: 12,
            }}
          >
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="Sessions by channel over the last 30 days, broken down by device…"
              className="no-focus-ring"
              style={{
                width: "100%",
                resize: "none",
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--v2-ink)",
                fontFamily: "var(--v2-font-sans)",
              }}
            />
          </div>
        </div>

        {/* Chart-type picker */}
        <div style={{ padding: "10px 16px 4px" }}>
          <div style={{ marginBottom: 8 }}>
            <span className="kicker">Chart type</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
            }}
          >
            {CHART_TYPES.map((c) => {
              const active = c.id === selected;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.hint}
                  onClick={() => setSelected(c.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                    padding: "10px 6px 8px",
                    background: active ? "var(--v2-surface-2)" : "var(--v2-surface)",
                    color: "var(--v2-ink)",
                    border: `1px solid ${active ? "var(--v2-line-strong)" : "var(--v2-line)"}`,
                    boxShadow: active
                      ? "inset 0 0 0 1px var(--v2-line-strong)"
                      : "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 10.5,
                    fontWeight: 500,
                    fontFamily: "var(--v2-font-sans)",
                    transition: "all 120ms var(--v2-ease)",
                  }}
                >
                  <span
                    style={{
                      color: active ? "var(--v2-ink)" : "var(--v2-ink-muted)",
                    }}
                  >
                    {c.glyph}
                  </span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer controls */}
        <div
          style={{
            padding: "14px 16px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              borderRadius: 6,
              background: "var(--v2-surface-2)",
              border: "1px solid var(--v2-line)",
              color: "var(--v2-ink-muted)",
              fontSize: 11,
              fontFamily: "var(--v2-font-sans)",
            }}
          >
            <I.Db size={11} />
            <span className="mono">
              {typeof sourceCount === "number"
                ? `${sourceCount} source${sourceCount === 1 ? "" : "s"}`
                : "All sources"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {error && (
              <span style={{ fontSize: 11, color: "var(--v2-neg)", marginRight: 4 }}>
                {error}
              </span>
            )}
            <Btn variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Btn>
            <Btn
              variant="brand"
              size="sm"
              disabled={busy || !prompt.trim()}
              icon={busy ? undefined : <I.Sparkle size={12} />}
              onClick={() =>
                onSubmit({ prompt: prompt.trim(), chartType: selected })
              }
            >
              {busy ? "Generating…" : submitLabel}
            </Btn>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--v2-line)" }} />

        {examples.length > 0 && (
          <div style={{ padding: "12px 16px 16px" }}>
            <div className="kicker" style={{ marginBottom: 8 }}>
              Or try one of these
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {examples.map((e, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(e)}
                  className="v2-chip"
                >
                  <I.Plus size={10} style={{ color: "var(--v2-ink-subtle)" }} />
                  <span>{e}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
