"use client";

import * as React from "react";
import { I } from "./icons";
import { Markdown } from "./Messages";
import ChartRenderer from "../ChartRenderer";

/* =============================================================
   SCORECARD
   ============================================================= */

interface ScorecardProps {
  value: string;
  label: string;
  change?: string;
  period?: string;
  sparkline?: React.ReactNode;
}

export function Scorecard({
  value,
  label,
  change,
  period = "vs. last 7d",
  sparkline,
}: ScorecardProps) {
  const isNeg = change ? change.startsWith("-") : false;
  return (
    <div
      className="bw-card v2-attach-in"
      style={{ padding: "18px 20px", marginBottom: 12, width: 340 }}
    >
      <div style={{ marginBottom: 10 }}>
        <span className="kicker">{label}</span>
      </div>
      <div
        className="num"
        style={{
          fontSize: 40,
          fontWeight: 600,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          color: "var(--v2-ink)",
          marginBottom: 8,
        }}
      >
        {value}
      </div>
      {change && (
        <span
          className={`delta ${isNeg ? "neg" : "pos"}`}
          style={{ fontSize: 13, fontWeight: 500 }}
        >
          {isNeg ? <I.Down size={11} /> : <I.Up size={11} />}
          {change}
          <span
            style={{
              color: "var(--v2-ink-muted)",
              marginLeft: 4,
              fontWeight: 400,
            }}
          >
            {period}
          </span>
        </span>
      )}
      {sparkline && <div style={{ marginTop: 14 }}>{sparkline}</div>}
    </div>
  );
}

/* =============================================================
   INSIGHT CARD — the "aha moment" card. A single headline number
   + up-to-3 comparison scorecards + optional trend chart + a one-
   line ROMI implication + follow-up questions. Emitted by the
   model as a [[insight]]{...json...}[[/insight]] block.
   ============================================================= */

export interface InsightComparison {
  label: string;
  value: string;
  /** e.g. "+18%", "-5%", "+1,234". Sign drives arrow colour. */
  delta?: string;
}

export interface InsightPayload {
  headline?: string;
  primary: { value: string; label: string };
  comparisons?: InsightComparison[];
  /** ECharts option JSON, usually a line chart of the trend. */
  chart?: Record<string, unknown>;
  /** One-line ROMI implication. Required by the prompt. */
  romi?: string;
  /** Suggested follow-up questions, rendered outside this card. */
  followups?: string[];
}

function deltaDirection(delta?: string): "pos" | "neg" | "flat" {
  if (!delta) return "flat";
  const trimmed = delta.trim();
  if (trimmed.startsWith("-")) return "neg";
  if (trimmed.startsWith("+")) return "pos";
  return "flat";
}

function InlineComparison({ c }: { c: InsightComparison }) {
  const dir = deltaDirection(c.delta);
  const deltaClass = dir === "neg" ? "neg" : dir === "pos" ? "pos" : "";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--v2-ink-muted)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {c.label}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.005em",
            color: "var(--v2-ink)",
            lineHeight: 1.1,
          }}
        >
          {c.value}
        </span>
        {c.delta && (
          <span
            className={`delta ${deltaClass}`}
            style={{
              fontSize: 11,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              lineHeight: 1,
            }}
          >
            {dir === "neg" ? <I.Down size={9} /> : dir === "pos" ? <I.Up size={9} /> : null}
            {c.delta}
          </span>
        )}
      </div>
    </div>
  );
}

/** Force ECharts option into a compact sparkline-style shape: no axis labels,
 *  minimal padding, small height. Preserves series data but strips heavy
 *  presentation config that wastes vertical space. */
function compactChartOption(base: Record<string, unknown>): Record<string, unknown> {
  return {
    ...base,
    grid: { left: 4, right: 4, top: 6, bottom: 6, containLabel: false },
    xAxis: {
      ...(base.xAxis as Record<string, unknown> | undefined),
      show: false,
      boundaryGap: false,
    },
    yAxis: {
      ...(base.yAxis as Record<string, unknown> | undefined),
      show: false,
    },
    tooltip: { trigger: "axis" },
    legend: undefined,
    title: undefined,
  };
}

export function InsightCard({ insight }: { insight: InsightPayload }) {
  const hasChart = !!insight.chart;
  const comparisons = insight.comparisons ?? [];
  const compactChart = hasChart
    ? compactChartOption(insight.chart as Record<string, unknown>)
    : null;
  return (
    <div
      className="bw-card v2-attach-in"
      style={{ marginBottom: 10, overflow: "hidden" }}
    >
      {/* Main row: primary number + comparisons inline. Sparkline is its own
          tight strip underneath so the numbers stay fully legible.
          Headline is intentionally not rendered here — the body text under
          the card already carries the plain-English interpretation, and
          showing both produces the same sentence twice.                   */}
      <div
        style={{
          padding: "12px 14px 10px",
          display: "flex",
          alignItems: "flex-end",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--v2-ink-muted)",
              marginBottom: 2,
            }}
          >
            {insight.primary.label}
          </div>
          <div
            className="num"
            style={{
              fontSize: 32,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "var(--v2-ink)",
            }}
          >
            {insight.primary.value}
          </div>
        </div>
        {comparisons.slice(0, 3).map((c, i) => (
          <InlineComparison key={i} c={c} />
        ))}
      </div>

      {/* Tight sparkline — fixed 72px via styleOverride so ChartRenderer
          doesn't fall back to its default 400px and blow out the card.   */}
      {compactChart && (
        <div style={{ padding: "0 6px", borderTop: "1px solid var(--v2-line)" }}>
          <ChartRenderer
            option={compactChart}
            styleOverride={{ width: "100%", height: 72 }}
          />
        </div>
      )}

      {/* ROMI — compact single-line callout */}
      {insight.romi && (
        <div
          style={{
            padding: "8px 12px",
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "color-mix(in oklab, var(--v2-brand-vivid) 8%, transparent)",
            borderTop: "1px solid var(--v2-line)",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "var(--v2-brand-vivid)",
              color: "var(--v2-on-brand)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <I.Sparkle size={9} />
          </div>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: "var(--v2-brand)",
              flexShrink: 0,
            }}
          >
            ROMI
          </span>
          <span
            style={{
              fontSize: 12,
              lineHeight: 1.4,
              color: "var(--v2-ink)",
              minWidth: 0,
            }}
          >
            {insight.romi}
          </span>
        </div>
      )}
    </div>
  );
}

/* =============================================================
   SPARKLINE
   ============================================================= */

export function Sparkline({
  points,
  w = 260,
  h = 36,
}: {
  points: number[];
  w?: number;
  h?: number;
}) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const step = w / (points.length - 1);
  const norm = (v: number) => h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${i * step},${norm(v)}`)
    .join(" ");
  const area = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height={h}
      style={{ display: "block" }}
    >
      <path d={area} fill="var(--v2-c-1)" opacity="0.22" />
      <path
        d={d}
        stroke="var(--v2-c-1)"
        strokeWidth="1.75"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={w}
        cy={norm(points[points.length - 1])}
        r="2.5"
        fill="var(--v2-c-1)"
      />
    </svg>
  );
}

/* =============================================================
   CHART CARD (wraps existing ECharts renderer)
   ============================================================= */

interface ChartCardProps {
  title: string;
  kicker?: string;
  subtitle?: string;
  /** ECharts option passed through to ChartRenderer */
  option?: Record<string, unknown>;
  /** Or arbitrary chart body if not using ECharts */
  children?: React.ReactNode;
  legend?: React.ReactNode;
  height?: number;
}

export function ChartCard({
  title,
  kicker = "Chart",
  subtitle,
  option,
  children,
  legend,
  height = 260,
}: ChartCardProps) {
  return (
    <div className="bw-card v2-attach-in" style={{ marginBottom: 12, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 10px" }}>
        <div className="kicker" style={{ marginBottom: 3 }}>
          {kicker}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.005em",
            color: "var(--v2-ink)",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{ fontSize: 11.5, color: "var(--v2-ink-muted)", marginTop: 2 }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ borderTop: "1px solid var(--v2-line)" }} />
      <div style={{ padding: 16, minHeight: height }}>
        {option ? <ChartRenderer option={option} /> : children}
      </div>
      {legend && (
        <>
          <div style={{ borderTop: "1px solid var(--v2-line)" }} />
          <div
            style={{
              padding: "10px 16px",
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            {legend}
          </div>
        </>
      )}
    </div>
  );
}

export function LegendChip({
  label,
  kind = "solid",
  value,
}: {
  label: string;
  kind?: "solid" | "dashed";
  value?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        color: "var(--v2-ink-muted)",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 2,
          background: kind === "solid" ? "var(--v2-ink)" : "transparent",
          borderTop:
            kind === "dashed" ? "1.5px dashed var(--v2-ink-muted)" : "none",
        }}
      />
      <span style={{ color: "var(--v2-ink)" }}>{label}</span>
      {value && (
        <span className="mono" style={{ color: "var(--v2-ink-muted)" }}>
          {value}
        </span>
      )}
    </span>
  );
}

/* =============================================================
   TABLE CARD
   ============================================================= */

export interface TableColumn {
  label: string;
  num?: boolean;
  mono?: boolean;
  w?: number | string;
}

interface TableCardProps {
  title: string;
  kicker?: string;
  columns: TableColumn[];
  rows: React.ReactNode[][];
  footnote?: string;
}

export function TableCard({
  title,
  kicker = "Table",
  columns,
  rows,
  footnote,
}: TableCardProps) {
  return (
    <div className="bw-card" style={{ marginBottom: 12, overflow: "hidden" }}>
      <div
        style={{
          padding: "14px 16px 10px",
        }}
      >
        <div className="kicker" style={{ marginBottom: 3 }}>
          {kicker}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--v2-ink)" }}>
          {title}
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                className={c.num ? "num" : ""}
                style={{ width: c.w }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={columns[j].num ? "num" : ""}>
                  {columns[j].mono ? (
                    <span className="mono">{cell}</span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footnote && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--v2-line)",
            fontSize: 11,
            color: "var(--v2-ink-muted)",
            fontFamily: "var(--v2-font-mono)",
          }}
        >
          {footnote}
        </div>
      )}
    </div>
  );
}

/* =============================================================
   RECOMMENDATION CALLOUT
   ============================================================= */

export function Rec({
  children,
  label = "Recommended next action",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div
      style={{
        marginTop: 4,
        marginBottom: 12,
        display: "flex",
        gap: 14,
        padding: "16px 18px",
        background: "color-mix(in oklab, var(--v2-brand-vivid) 12%, transparent)",
        border: "1.5px solid var(--v2-brand-vivid)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "var(--v2-brand-vivid)",
          color: "var(--v2-on-brand)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <I.Check size={13} stroke={2.5} />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--v2-font-sans)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "var(--v2-brand)",
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--v2-ink)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   TOOL CARD (generic tool-result wrapper)
   ============================================================= */

export function ToolCard({
  name,
  params,
  duration,
  children,
}: {
  name: string;
  params?: string;
  duration?: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="bw-card bw-card-tight"
      style={{
        marginBottom: 12,
        overflow: "hidden",
        background: "var(--v2-surface-2)",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--v2-font-mono)",
          fontSize: 11,
          color: "var(--v2-ink-muted)",
        }}
      >
        <I.Db size={11} />
        <span style={{ color: "var(--v2-ink)" }}>{name}</span>
        {params && (
          <span style={{ color: "var(--v2-ink-subtle)" }}>({params})</span>
        )}
        <div style={{ flex: 1 }} />
        <I.Check size={11} style={{ color: "var(--v2-pos)" }} />
        {duration != null && (
          <span style={{ color: "var(--v2-ink-subtle)" }}>
            {duration.toFixed(1)}s
          </span>
        )}
      </div>
      {children && (
        <>
          <div style={{ borderTop: "1px solid var(--v2-line)" }} />
          <div style={{ padding: 12 }}>{children}</div>
        </>
      )}
    </div>
  );
}

/* =============================================================
   SUGGESTED QUESTIONS
   ============================================================= */

export function Suggested({
  items,
  label = "Follow-up questions",
  onSelect,
}: {
  items: string[];
  label?: string;
  onSelect?: (item: string) => void;
}) {
  if (!items?.length) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <div
        className="kicker"
        style={{
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
            borderRadius: 999,
            background: "var(--v2-brand-vivid)",
            color: "var(--v2-on-brand)",
            fontSize: 9,
            fontWeight: 800,
          }}
        >
          ?
        </span>
        <span>{label}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--v2-line)",
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--v2-surface)",
        }}
      >
        {items.map((q, i) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelect?.(q)}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 14px",
              borderTop: i === 0 ? "none" : "1px solid var(--v2-line)",
              fontFamily: "var(--v2-font-sans)",
              fontSize: 13,
              color: "var(--v2-ink)",
              lineHeight: 1.4,
              transition: "background 120ms var(--v2-ease)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--v2-surface-2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ flex: 1 }}>{q}</span>
            <I.ChevronR
              size={13}
              style={{ color: "var(--v2-ink-subtle)", flexShrink: 0 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/* Re-export Markdown for convenience */
export { Markdown } from "./Messages";

/* =============================================================
   STAT GRID — row of metric cards for multi-metric overviews.
   Model emits: [[stat-grid]]{json}[[/stat-grid]]
   JSON shape: { stats: [{ label, value, delta?, suffix? }] }
   ============================================================= */

interface StatItem {
  label: string;
  value: string;
  delta?: string;
  suffix?: string;
}

interface StatGridPayload {
  stats: StatItem[];
}

export function StatGrid({ payload }: { payload: StatGridPayload }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(payload.stats.length, 4)}, 1fr)`,
        gap: 10,
        marginBottom: 12,
      }}
    >
      {payload.stats.map((s, i) => {
        const dir = deltaDirection(s.delta);
        const deltaClass = dir === "neg" ? "neg" : dir === "pos" ? "pos" : "";
        return (
          <div
            key={i}
            className="bw-card v2-attach-in"
            style={{ padding: "14px 16px" }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--v2-ink-muted)",
                marginBottom: 4,
              }}
            >
              {s.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: "var(--v2-ink)",
                }}
              >
                {s.value}
              </span>
              {s.suffix && (
                <span style={{ fontSize: 13, color: "var(--v2-ink-muted)" }}>
                  {s.suffix}
                </span>
              )}
            </div>
            {s.delta && (
              <span
                className={`delta ${deltaClass}`}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  marginTop: 4,
                }}
              >
                {dir === "neg" ? <I.Down size={10} /> : dir === "pos" ? <I.Up size={10} /> : null}
                {s.delta}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* =============================================================
   CALLOUT — highlighted info/warning/success box.
   Model emits: [[callout]]{json}[[/callout]]
   JSON shape: { type: "info"|"warning"|"success", title?, text }
   ============================================================= */

interface CalloutPayload {
  type?: "info" | "warning" | "success";
  title?: string;
  text: string;
}

const CALLOUT_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  info: { bg: "color-mix(in oklab, #3b82f6 8%, transparent)", border: "#3b82f6", icon: "ℹ" },
  warning: { bg: "color-mix(in oklab, #f59e0b 10%, transparent)", border: "#f59e0b", icon: "⚠" },
  success: { bg: "color-mix(in oklab, #10b981 8%, transparent)", border: "#10b981", icon: "✓" },
};

export function CalloutBlock({ payload }: { payload: CalloutPayload }) {
  const style = CALLOUT_STYLES[payload.type || "info"] || CALLOUT_STYLES.info;
  return (
    <div
      style={{
        marginBottom: 12,
        padding: "14px 16px",
        background: style.bg,
        borderLeft: `3px solid ${style.border}`,
        borderRadius: 8,
      }}
    >
      {payload.title && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--v2-ink)",
            marginBottom: 4,
          }}
        >
          {payload.title}
        </div>
      )}
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: "var(--v2-ink)",
        }}
      >
        {payload.text}
      </div>
    </div>
  );
}

/* =============================================================
   ASSISTANT CONTENT — splits on [[rec]]...[[/rec]], [[insight]],
   [[stat-grid]], and [[callout]] blocks. Handles mid-stream state
   where the closing tag hasn't arrived yet.
   ============================================================= */

const REC_OPEN = "[[rec]]";
const REC_CLOSE = "[[/rec]]";
const INSIGHT_OPEN = "[[insight]]";
const INSIGHT_CLOSE = "[[/insight]]";
const STATGRID_OPEN = "[[stat-grid]]";
const STATGRID_CLOSE = "[[/stat-grid]]";
const CALLOUT_OPEN = "[[callout]]";
const CALLOUT_CLOSE = "[[/callout]]";

type Segment =
  | { kind: "md"; text: string }
  | { kind: "rec"; text: string; open?: boolean }
  | { kind: "insight"; raw: string; payload?: InsightPayload; open?: boolean }
  | { kind: "stat-grid"; raw: string; payload?: StatGridPayload; open?: boolean }
  | { kind: "callout"; raw: string; payload?: CalloutPayload; open?: boolean };

function tryParseJSON<T>(raw: string): T | undefined {
  try {
    const parsed = JSON.parse(raw.trim());
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed as T;
  } catch {
    return undefined;
  }
}

function tryParseInsight(raw: string): InsightPayload | undefined {
  const parsed = tryParseJSON<InsightPayload>(raw);
  if (!parsed?.primary || typeof parsed.primary.value !== "string") return undefined;
  return parsed;
}

type MarkerKind = "rec" | "insight" | "stat-grid" | "callout";

/** Find the next opening marker. Returns the earliest one, or null. */
function nextMarker(text: string, cursor: number): { idx: number; kind: MarkerKind } | null {
  const candidates: { idx: number; kind: MarkerKind }[] = [];
  const recIdx = text.indexOf(REC_OPEN, cursor);
  if (recIdx !== -1) candidates.push({ idx: recIdx, kind: "rec" });
  const insightIdx = text.indexOf(INSIGHT_OPEN, cursor);
  if (insightIdx !== -1) candidates.push({ idx: insightIdx, kind: "insight" });
  const statIdx = text.indexOf(STATGRID_OPEN, cursor);
  if (statIdx !== -1) candidates.push({ idx: statIdx, kind: "stat-grid" });
  const calloutIdx = text.indexOf(CALLOUT_OPEN, cursor);
  if (calloutIdx !== -1) candidates.push({ idx: calloutIdx, kind: "callout" });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.idx - b.idx);
  return candidates[0];
}

function splitIntoSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const marker = nextMarker(text, cursor);
    if (!marker) {
      segments.push({ kind: "md", text: text.slice(cursor) });
      break;
    }
    if (marker.idx > cursor) {
      segments.push({ kind: "md", text: text.slice(cursor, marker.idx) });
    }
    if (marker.kind === "rec") {
      const contentStart = marker.idx + REC_OPEN.length;
      const closeIdx = text.indexOf(REC_CLOSE, contentStart);
      if (closeIdx === -1) {
        segments.push({
          kind: "rec",
          text: text.slice(contentStart),
          open: true,
        });
        return segments;
      }
      segments.push({ kind: "rec", text: text.slice(contentStart, closeIdx) });
      cursor = closeIdx + REC_CLOSE.length;
    } else {
      const config: Record<MarkerKind, { open: string; close: string }> = {
        rec: { open: REC_OPEN, close: REC_CLOSE },
        insight: { open: INSIGHT_OPEN, close: INSIGHT_CLOSE },
        "stat-grid": { open: STATGRID_OPEN, close: STATGRID_CLOSE },
        callout: { open: CALLOUT_OPEN, close: CALLOUT_CLOSE },
      };
      const { open, close } = config[marker.kind];
      const contentStart = marker.idx + open.length;
      const closeIdx = text.indexOf(close, contentStart);
      if (closeIdx === -1) {
        segments.push({
          kind: marker.kind,
          raw: text.slice(contentStart),
          open: true,
        } as Segment);
        return segments;
      }
      const raw = text.slice(contentStart, closeIdx);
      if (marker.kind === "insight") {
        segments.push({ kind: "insight", raw, payload: tryParseInsight(raw) });
      } else if (marker.kind === "stat-grid") {
        segments.push({ kind: "stat-grid", raw, payload: tryParseJSON<StatGridPayload>(raw) });
      } else if (marker.kind === "callout") {
        segments.push({ kind: "callout", raw, payload: tryParseJSON<CalloutPayload>(raw) });
      }
      cursor = closeIdx + close.length;
    }
  }
  return segments;
}

function InsightSkeleton() {
  return (
    <div
      className="bw-card v2-attach-in"
      style={{
        marginBottom: 10,
        padding: "10px 14px 12px",
        display: "flex",
        alignItems: "flex-end",
        gap: 24,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ width: 90, height: 9, borderRadius: 3, background: "var(--v2-surface-2)" }} />
        <div style={{ width: 90, height: 28, borderRadius: 5, background: "var(--v2-surface-2)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ width: 70, height: 9, borderRadius: 3, background: "var(--v2-surface-2)" }} />
        <div style={{ width: 60, height: 16, borderRadius: 4, background: "var(--v2-surface-2)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ width: 70, height: 9, borderRadius: 3, background: "var(--v2-surface-2)" }} />
        <div style={{ width: 60, height: 16, borderRadius: 4, background: "var(--v2-surface-2)" }} />
      </div>
    </div>
  );
}

export function AssistantContent({
  text,
  streaming,
}: {
  text: string;
  streaming?: boolean;
}) {
  const segments = React.useMemo(() => splitIntoSegments(text), [text]);
  if (segments.length === 0) {
    return streaming ? <span className="caret" /> : null;
  }
  const lastIdx = segments.length - 1;
  return (
    <>
      {segments.map((seg, i) => {
        const isLast = i === lastIdx;
        const showCaret = streaming && isLast;
        if (seg.kind === "rec") {
          const body = seg.text.trim();
          return (
            <Rec key={i}>
              {body && <Markdown text={body} />}
              {showCaret && <span className="caret" />}
            </Rec>
          );
        }
        if (seg.kind === "insight") {
          if (seg.open || !seg.payload) {
            return <InsightSkeleton key={i} />;
          }
          return <InsightCard key={i} insight={seg.payload} />;
        }
        if (seg.kind === "stat-grid") {
          if (seg.open || !seg.payload) return <InsightSkeleton key={i} />;
          return <StatGrid key={i} payload={seg.payload} />;
        }
        if (seg.kind === "callout") {
          if (seg.open || !seg.payload) return null;
          return <CalloutBlock key={i} payload={seg.payload} />;
        }
        const body = seg.text;
        if (!body.trim() && !showCaret) return null;
        return (
          <React.Fragment key={i}>
            {body.trim() && <Markdown text={body} />}
            {showCaret && <span className="caret" />}
          </React.Fragment>
        );
      })}
    </>
  );
}
