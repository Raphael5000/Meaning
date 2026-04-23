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
   ASSISTANT CONTENT — splits on [[rec]]...[[/rec]] blocks so the
   green Rec callout renders properly.  Handles mid-stream state
   where the closing `[[/rec]]` tag hasn't arrived yet.
   ============================================================= */

const REC_OPEN = "[[rec]]";
const REC_CLOSE = "[[/rec]]";

type Segment =
  | { kind: "md"; text: string }
  | { kind: "rec"; text: string; open?: boolean };

function splitIntoSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const openIdx = text.indexOf(REC_OPEN, cursor);
    if (openIdx === -1) {
      segments.push({ kind: "md", text: text.slice(cursor) });
      break;
    }
    if (openIdx > cursor) {
      segments.push({ kind: "md", text: text.slice(cursor, openIdx) });
    }
    const contentStart = openIdx + REC_OPEN.length;
    const closeIdx = text.indexOf(REC_CLOSE, contentStart);
    if (closeIdx === -1) {
      /* Still streaming — rec block is open but not yet closed */
      segments.push({
        kind: "rec",
        text: text.slice(contentStart),
        open: true,
      });
      return segments;
    }
    segments.push({ kind: "rec", text: text.slice(contentStart, closeIdx) });
    cursor = closeIdx + REC_CLOSE.length;
  }
  return segments;
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
